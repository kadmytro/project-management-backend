import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Task } from "../entity/Task";
import { Project } from "../entity/Project";
import { ProjectPhase } from "../entity/ProjectPhase";
import { User } from "../entity/User";
import { TaskStatus } from "../entity/TaskStatus";
import { RecurrenceFrequency } from "../entity/RecurrenceFrequency";
import { getErrorDetails } from "../utils/errorFormatter";
import { DefaultTaskStatusKey } from "../type/DefaultTaskStatusKey";
import { Brackets, In } from "typeorm";
import { Subtask } from "../entity/Subtask";
import { isValidTaskType, TaskType } from "../type/TaskType";
import { RecurrenceFrequencyController } from "./RecurrenceFrequencyController";
import { generateSubtasksForTask } from "../utils/subtaskGenerator";
import { cleanupSubtask } from "../utils/cleanupSubtask";
import { isValidSubmissionType, SubmissionType } from "../type/SubmissionType";
import { getEntityResourceId } from "../service/authService";
import { ResourceType } from "../type/ResourceType";
import { Resource } from "../entity/Resource";
import { FileItem } from "../entity/FileItem";
import { FileStorageManager } from "../service/FileStorageManager";
import { FileType, StorageType } from "../type/FileType";
import { TaskCompletionFile } from "../entity/TaskCompletionFile";

export class TaskController {
  static async getAllTasks(req: Request, res: Response) {
    try {
      const taskRepository = AppDataSource.getRepository(Task);
      const tasks = await taskRepository.find({
        relations: [
          "project",
          "projectPhase",
          "assignee",
          "verifier",
          "status",
          "recurrenceFrequency",
          "subtasks",
          "taskCompletionFile",
          "taskCompletionFile.fileItem",
        ],
      });
      res.status(200).json(tasks.map((t) => t.getDetails()));
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async getTask(req: Request, res: Response) {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ message: "Task id is required" });
      return;
    }

    try {
      const taskRepository = AppDataSource.getRepository(Task);
      const task = await taskRepository.findOne({
        where: { id: parseInt(id) },
        relations: [
          "project",
          "projectPhase",
          "assignee",
          "assigneeRole",
          "verifier",
          "verifierRole",
          "status",
          "recurrenceFrequency",
          "subtasks",
          "taskCompletionFile",
          "taskCompletionFile.fileItem",
        ],
      });

      if (!task) {
        res.status(404).json({ message: "Task not found" });
        return;
      }
      res.status(200).json(task.getDetails());
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async getTasksWithTaskStatus(req: Request, res: Response) {
    const { taskStatusId } = req.params;

    if (!taskStatusId) {
      res.status(400).json({ message: "Task status id is required" });
      return;
    }

    try {
      const taskRepository = AppDataSource.getRepository(Task);
      const tasks = await taskRepository.find({
        where: { status: { id: parseInt(taskStatusId) } },
        relations: [
          "project",
          "projectPhase",
          "assignee",
          "assigneeRole",
          "verifier",
          "verifierRole",
          "status",
          "recurrenceFrequency",
          "subtasks",
        ],
      });

      res.status(200).json(tasks.map((t) => t.getDetails()));
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async getSubtasks(req: Request, res: Response) {
    try {
      const taskId = req.params["id"];
      if (!taskId) {
        res.set(400).json({ message: "task Id is not provided" });
        return;
      }
      const subtaskRepository = AppDataSource.getRepository(Subtask);
      const subtasks = await subtaskRepository.find({
        where: { task: { id: parseInt(taskId) } },
        relations: ["task", "assignee", "status"],
      });
      res.status(200).json(subtasks?.map((s) => s.getDetails()));
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async createTask(req: Request, res: Response) {
    try {
      const { projectId, projectPhaseId } = req.params;

      if (!projectPhaseId && !projectId) {
        res.status(400).json({
          message:
            "Either project Id or a project Phase Id must be specified. Task cannot exist independently",
        });
        return;
      }

      const {
        title,
        description,
        submissionType,
        startDate,
        endDate,
        statusId,
        isRecurring,
        type,
        assigneeId,
        verifierId,
        ordinal,
        recurrenceDetails,
      } = req.body;

      const taskRepository = AppDataSource.getRepository(Task);
      const projectRepository = AppDataSource.getRepository(Project);
      const projectPhaseRepository = AppDataSource.getRepository(ProjectPhase);
      const userRepository = AppDataSource.getRepository(User);
      const statusRepository = AppDataSource.getRepository(TaskStatus);

      if (!title) {
        res.status(400).json({ message: "Title is mandatory!" });
        return;
      }

      const projectPhase = projectPhaseId
        ? await projectPhaseRepository.findOne({
            where: { id: parseInt(projectPhaseId) },
            relations: ["project", "tasks"],
          })
        : null;

      const project = projectPhase
        ? projectPhase.project
        : projectId
        ? await projectRepository.findOne({
            where: { id: parseInt(projectId) },
            relations: ["phases", "tasks"],
          })
        : null;

      if (!project) {
        res.status(404).json({ message: "Project not found" });
        return;
      }

      let errorMessages = [];

      if (isRecurring && !recurrenceDetails) {
        errorMessages.push(
          "Recurrence details are required for recurring tasks"
        );
      }

      if (isRecurring && (!startDate || !endDate)) {
        errorMessages.push(
          "Start and end date are required for recurring tasks"
        );
      }

      if (errorMessages.length) {
        res.status(400).json({ message: errorMessages.join(", ") });
        return;
      }

      const assignee = assigneeId
        ? await userRepository
            .createQueryBuilder("user")
            .leftJoin("user.managingProjects", "managingProjects")
            .leftJoin("user.participatingInProjects", "participatingInProjects")
            .where("user.id = :assigneeId", { assigneeId })
            .andWhere(
              new Brackets((qb) => {
                qb.where("managingProjects.id = :projectId", {
                  projectId: project.id,
                }).orWhere("participatingInProjects.id = :projectId", {
                  projectId: project.id,
                });
              })
            )
            .getOne()
        : null;

      if (assigneeId && !assignee) {
        res.status(400).json({
          message:
            "The user is not a part of the project and cannot be assigned to this task",
        });
        return;
      }

      const verifier = verifierId
        ? await userRepository.findOne({
            where: {
              id: verifierId,
              managingProjects: {
                id: project.id,
              },
            },
            relations: ["managingProjects"],
          })
        : null;

      if (verifierId && !verifier) {
        res.status(400).json({
          message:
            "The user is not a part of the project managing team and cannot be assigned to verify this task",
        });
        return;
      }

      const status = statusId
        ? await statusRepository.findOneBy({ id: statusId })
        : await statusRepository.findOneBy({
            key: DefaultTaskStatusKey.NOT_SET,
          });

      const newTask = taskRepository.create({
        title,
        description,
        startDate,
        endDate,
        project,
      });

      if (projectPhase) {
        newTask.projectPhase = projectPhase;
      }

      if (verifier) {
        newTask.verifier = verifier;
      }

      if (submissionType && isValidSubmissionType(submissionType)) {
        newTask.submissionType = submissionType;
      }

      if (type && isValidTaskType(type)) {
        newTask.type = type;
      }

      if (assignee) {
        newTask.assignee = assignee;
      }

      if (status) {
        newTask.status = status;
      }

      if (ordinal) {
        newTask.ordinal = parseInt(ordinal);
      } else {
        const ordinal = projectPhase
          ? Math.max(...projectPhase.tasks?.map((t) => t.ordinal), 0) + 1
          : Math.max(...project.tasks?.map((t) => t.ordinal), 0) + 1;
        newTask.ordinal = ordinal;
      }

      const savedTask = await taskRepository.save(newTask);

      try {
        if (isRecurring && recurrenceDetails) {
          const frequencyRepository =
            AppDataSource.getRepository(RecurrenceFrequency);
          const newFrequency =
            RecurrenceFrequencyController.createRecurrenceFrequencyEntity(
              recurrenceDetails
            );
          newFrequency.task = savedTask;
          await frequencyRepository.save(newFrequency);
          savedTask.recurrenceFrequency = newFrequency;
          savedTask.isRecurring = true;
        }

        if (
          savedTask.isRecurring ||
          savedTask.type === TaskType.BY_PARTICIPANT ||
          savedTask.type === TaskType.PER_PARTICIPANT
        ) {
          await generateSubtasksForTask(savedTask);
        }
      } catch (error) {
        await taskRepository.remove(savedTask);
        res.status(400).json({
          message: "Error creating task",
          error: getErrorDetails(error),
        });
        return;
      }

      await taskRepository.save(savedTask);

      res.status(201).json({ message: "Task created successfully" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async reorderTasks(req: Request, res: Response) {
    try {
      const { projectPhaseId, projectId } = req.params;
      const { tasks } = req.body; // expected to be like this: [{id: taskId, ordinal: ordinal}]

      if ((!projectPhaseId && !projectId) || !tasks || !Array.isArray(tasks)) {
        res.status(400).json({
          message:
            "projectPhaseId or projectId is needed as well as the tasks array",
        });
        return;
      }

      if (
        tasks.some(
          (task) =>
            !task ||
            typeof task.id !== "number" ||
            typeof task.ordinal !== "number"
        )
      ) {
        res
          .status(400)
          .json({ message: "Each task must have a valid id and ordinal" });
        return;
      }

      const taskRepository = AppDataSource.getRepository(Task);
      const taskIds = tasks.map((task) => task.id);

      const tasksToUpdate = projectPhaseId
        ? await taskRepository.find({
            where: {
              projectPhase: { id: parseInt(projectPhaseId) }, //checking to ensure that we update tasks only from the correct phase;
              id: In(taskIds),
            },
          })
        : await taskRepository.find({
            where: {
              project: { id: parseInt(projectId) }, //checking to ensure that we update tasks only from the correct project;
              id: In(taskIds),
            },
          });

      const updatedTasks = tasksToUpdate.map((task) => {
        const matchingTask = tasks.find((p) => p.id === task.id);
        if (matchingTask) {
          task.ordinal = matchingTask.ordinal;
        }
        return task;
      });

      await taskRepository.save(updatedTasks);

      res.status(200).json({ message: "tasks successfully reordered" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async submitTask(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { storageType, ownerId } = req.body;
      const fileData = req.file;
      const taskRepository = AppDataSource.getRepository(Task);
      const fileRepository = AppDataSource.getTreeRepository(FileItem);
      const taskStatusRepository = AppDataSource.getRepository(TaskStatus);
      const taskCompletionFileRepo =
        AppDataSource.getRepository(TaskCompletionFile);
      const task = await taskRepository.findOne({
        where: { id: parseInt(id) },
        relations: [
          "projectPhase",
          "project",
          "status",
          "subtasks",
          "subtasks.status",
          "verifier",
        ],
      });
      const userRepository = AppDataSource.getRepository(User);

      if (!task) {
        res.status(404).json({ message: "task not found" });
        return;
      }

      if (
        task.status?.key === DefaultTaskStatusKey.DONE ||
        task.status?.key === DefaultTaskStatusKey.IN_VERIFICATION
      ) {
        res.status(400).json({
          message: `Task with status "${task.status?.name}" cannot be submitted`,
        });
        return;
      }

      if (
        task?.subtasks.some((s) => s.status?.key !== DefaultTaskStatusKey.DONE)
      ) {
        res.status(400).json({
          message: "All subtasks must be finished before task can be submitted",
        });
        return;
      }

      const owner = ownerId
        ? await userRepository.findOneBy({ id: ownerId })
        : null;

      if (ownerId && !owner) {
        res.status(404).json({ message: "Owner not found" });
        return;
      }

      if (
        task.submissionType === SubmissionType.FILE_UPLOAD &&
        task.type === TaskType.SINGLE &&
        !task.isRecurring &&
        !fileData
      ) {
        res
          .status(400)
          .json({ message: "You must upload a file to submit this task." });
        return;
      }

      if (task.submissionType === SubmissionType.FILE_UPLOAD && fileData) {
        const resource = await AppDataSource.getRepository(Resource).findOne({
          where: { type: ResourceType.TASK, entityId: task.id },
          relations: ["correspondingFolder"],
        });

        if (!resource) {
          res
            .status(404)
            .json({ message: "No resource corresponding to the task found." });
          return;
        }

        const correspondingFolder = resource.correspondingFolder;

        if (!correspondingFolder) {
          res.status(404).json({
            message:
              "Something is wrong with this task. No task corresponding folder found.",
          });
          return;
        }
        const filePath = `${Date.now()}-${fileData.originalname}`;
        const fileStorageManager = new FileStorageManager(storageType);
        const fileUrl = await fileStorageManager.uploadFile(
          fileData.buffer,
          filePath
        );

        const newFile = fileRepository.create({
          fileName: fileData?.originalname,
          type: FileType.FILE,
          storageType: storageType,
          parent: correspondingFolder,
          size: fileData?.size,
          filePath: filePath,
          fileUrl: storageType === StorageType.CLOUD ? fileUrl : null,
          owner: owner,
        });

        const fileItem = await fileRepository.save(newFile);

        const taskCompletionFile = taskCompletionFileRepo.create({
          fileItem: fileItem,
          task: task,
        });

        task.taskCompletionFile = taskCompletionFile;
      }

      task.submissionDate = new Date();
      const updatedStatusName = task.verifier
        ? DefaultTaskStatusKey.IN_VERIFICATION
        : DefaultTaskStatusKey.DONE;
      const newStatus = await taskStatusRepository.findOne({
        where: { key: updatedStatusName },
      });

      if (!newStatus) {
        res.status(500).json({
          message: `Task status with key ${updatedStatusName} not found in the database. Something is wrong with the project`,
        });
        return;
      }

      task.status = newStatus;

      await taskRepository.save(task);

      res.status(200).json({
        message: `Task sucessfully submitted. ${
          task.verifier ? "It is sent to verification" : ""
        }`,
      });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async verifyTask(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const taskRepository = AppDataSource.getRepository(Task);
      const taskStatusRepository = AppDataSource.getRepository(TaskStatus);
      const task = await taskRepository.findOne({
        where: { id: parseInt(id) },
        relations: [
          "projectPhase",
          "project",
          "status",
          "subtasks",
          "subtasks.status",
          "verifier",
        ],
      });

      if (!task) {
        res.status(404).json({ message: "Task not found!" });
        return;
      }

      if (task.status?.key !== DefaultTaskStatusKey.IN_VERIFICATION) {
        res.status(400).json({
          message: `Only tasks submitted for verification and having status with key 
          ${DefaultTaskStatusKey.IN_VERIFICATION} can be verified`,
        });
        return;
      }

      const newStatus = await taskStatusRepository.findOne({
        where: { key: DefaultTaskStatusKey.DONE },
      });

      if (!newStatus) {
        res.status(500).json({
          message: `Task status with key ${DefaultTaskStatusKey.DONE} not found in the database. Something is wrong with the project`,
        });
        return;
      }

      task.status = newStatus;

      await taskRepository.save(task);

      res.status(200).json({ message: "Task successfully verified!" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async updateTask(req: Request, res: Response) {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ message: "Task id is required" });
      return;
    }

    const {
      title,
      description,
      submissionType,
      startDate,
      endDate,
      statusId,
      isRecurring,
      assigneeId,
      verifierId,
      projectPhaseId,
      type,
      recurrenceDetails,
      ordinal,
    } = req.body;

    try {
      const taskRepository = AppDataSource.getRepository(Task);
      const projectPhaseRepository = AppDataSource.getRepository(ProjectPhase);
      const userRepository = AppDataSource.getRepository(User);
      const statusRepository = AppDataSource.getRepository(TaskStatus);

      if (type && !isValidTaskType(type)) {
        res.status(400).json({ message: "Invalid task type" });
        return;
      }

      if (submissionType && !isValidSubmissionType(submissionType)) {
        res.status(400).json({ message: "Invalid task submission type" });
        return;
      }

      const task = await taskRepository.findOne({
        where: { id: parseInt(id) },
        relations: [
          "status",
          "recurrenceFrequency",
          "assignee",
          "verifier",
          "projectPhase",
          "project",
          "subtasks",
        ],
      });

      if (!task) {
        res.status(404).json({ message: "Task not found" });
        return;
      }

      if (title !== undefined) {
        task.title = title;
      }

      if (description !== undefined) {
        task.description = description;
      }

      if (startDate !== undefined) {
        task.startDate = startDate ? new Date(startDate) : null;
      }

      if (endDate !== undefined) {
        task.endDate = endDate ? new Date(endDate) : null;
      }

      if (isRecurring !== undefined) {
        task.isRecurring = isRecurring;
      }

      if (statusId !== undefined) {
        task.status = statusId
          ? await statusRepository.findOneBy({ id: statusId })
          : null;
      }

      if (assigneeId !== undefined) {
        const assignee = assigneeId
          ? await userRepository
              .createQueryBuilder("user")
              .leftJoin("user.managingProjects", "managingProjects")
              .leftJoin(
                "user.participatingInProjects",
                "participatingInProjects"
              )
              .where("user.id = :assigneeId", { assigneeId })
              .andWhere(
                new Brackets((qb) => {
                  qb.where("managingProjects.id = :projectId", {
                    projectId: task.project.id,
                  }).orWhere("participatingInProjects.id = :projectId", {
                    projectId: task.project.id,
                  });
                })
              )
              .getOne()
          : null;

        if (assigneeId && !assignee) {
          res.status(400).json({
            message:
              "The user is not a part of the project and cannot be assigned to this task",
          });
          return;
        }
        task.assignee = assignee;
      }

      if (verifierId !== undefined) {
        const verifier = verifierId
          ? await userRepository.findOne({
              where: {
                id: verifierId,
                managingProjects: {
                  id: task.project.id,
                },
              },
              relations: ["managingProjects"],
            })
          : null;

        if (!verifier) {
          res.status(400).json({
            message:
              "The user is not a part of the project managing team and cannot be assigned to verify this task",
          });
          return;
        }
        task.verifier = verifier;
      }

      if (submissionType && isValidSubmissionType(submissionType)) {
        task.submissionType = submissionType;
      }

      if (projectPhaseId !== undefined) {
        const projectPhase = projectPhaseId
          ? await projectPhaseRepository.findOne({
              where: { id: projectPhaseId, project: { id: task.project.id } },
            })
          : null;

        if (projectPhaseId && !projectPhase) {
          res.status(400).json({
            message: "Project phase with such id not found in this project.",
          });
          return;
        }
        task.projectPhase = projectPhase;
      }

      if (
        (isRecurring !== undefined && task.isRecurring !== isRecurring) ||
        recurrenceDetails ||
        task.type !== type
      ) {
        TaskController.removeTaskAutogeneratedSubtasks(task);
        task.isRecurring = false;
        task.recurrenceFrequency = null;
      }

      if (isRecurring && recurrenceDetails) {
        if (!task.startDate || !task.endDate) {
          res.status(400).json({
            message: "Start and end date are required for recurring tasks",
          });
          return;
        }

        const frequencyRepository =
          AppDataSource.getRepository(RecurrenceFrequency);
        const newFrequency =
          RecurrenceFrequencyController.createRecurrenceFrequencyEntity(
            recurrenceDetails
          );
        newFrequency.task = task;
        await frequencyRepository.save(newFrequency);
        task.recurrenceFrequency = newFrequency;
        task.isRecurring = true;
      }

      if (
        (isRecurring && recurrenceDetails) ||
        ((type === TaskType.BY_PARTICIPANT ||
          type === TaskType.PER_PARTICIPANT) &&
          type !== task.type)
      ) {
        if (!task.startDate || !task.endDate) {
          res.status(400).json({
            message: "Start and end date are required for recurring tasks",
          });
          return;
        }

        task.type = type;
        await generateSubtasksForTask(task);
      }

      if (ordinal && typeof ordinal === "number") {
        task.ordinal = ordinal;
      }

      await taskRepository.save(task);
      await cleanupSubtask();

      res.status(200).json({ message: "Task updated successfully" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async deleteTask(req: Request, res: Response) {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ message: "Task id is required" });
      return;
    }

    try {
      const taskRepository = AppDataSource.getRepository(Task);
      const task = await taskRepository.findOneBy({ id: parseInt(id) });
      if (!task) {
        res.status(404).json({ message: "Task not found" });
        return;
      }

      await taskRepository.remove(task);

      res.status(200).json({ message: "Task deleted successfully" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async removeTaskAutogeneratedSubtasks(task: Task) {
    task.subtasks = task.subtasks.filter(
      (subtask) => !subtask.autoGenerated || subtask.submissionDate !== null
    );
  }
}
