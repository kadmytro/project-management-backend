import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Subtask } from "../entity/Subtask";
import { Task } from "../entity/Task";
import { User } from "../entity/User";
import { TaskStatus } from "../entity/TaskStatus";
import { getErrorDetails } from "../utils/errorFormatter";
import { DefaultTaskStatusKey } from "../type/DefaultTaskStatusKey";
import { In } from "typeorm";
import { FileItem } from "../entity/FileItem";
import { TaskCompletionFile } from "../entity/TaskCompletionFile";
import { SubmissionType } from "../type/SubmissionType";
import { Resource } from "../entity/Resource";
import { ResourceType } from "../type/ResourceType";
import { FileStorageManager } from "../service/FileStorageManager";
import { FileType, StorageType } from "../type/FileType";

export class SubtaskController {
  static async getAllSubtasks(req: Request, res: Response) {
    try {
      const subtaskRepository = AppDataSource.getRepository(Subtask);
      const subtasks = await subtaskRepository.find({
        relations: [
          "task",
          "assignee",
          "status",
          "taskCompletionFile",
          "taskCompletionFile.fileItem",
        ],
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

  static async getSubtask(req: Request, res: Response) {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ message: "Subtask id is required" });
      return;
    }

    try {
      const subtaskRepository = AppDataSource.getRepository(Subtask);
      const subtask = await subtaskRepository.findOne({
        where: { id: parseInt(id) },
        relations: [
          "task",
          "assignee",
          "status",
          "taskCompletionFile",
          "taskCompletionFile.fileItem",
        ],
      });

      if (!subtask) {
        res.status(404).json({ message: "Subtask not found" });
        return;
      }

      res.status(200).json(subtask.getDetails());
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async createSubtask(req: Request, res: Response) {
    try {
      const { taskId } = req.params;
      const {
        title,
        description,
        submissionType,
        assigneeId,
        statusId,
        ordinal,
      } = req.body;

      if (!taskId) {
        res.status(400).json({ message: "task in is not provided" });
        return;
      }

      const subtaskRepository = AppDataSource.getRepository(Subtask);
      const taskRepository = AppDataSource.getRepository(Task);
      const userRepository = AppDataSource.getRepository(User);
      const statusRepository = AppDataSource.getRepository(TaskStatus);

      if (!title) {
        res.status(400).json({ message: "Title is mandatory" });
        return;
      }

      const task = await taskRepository.findOne({
        where: { id: parseInt(taskId) },
        relations: ["subtasks"],
      });
      if (!task) {
        res.status(404).json({ message: "Task not found" });
        return;
      }

      const assignee = assigneeId
        ? await userRepository.findOneBy({ id: assigneeId })
        : null;

      const status = statusId
        ? await statusRepository.findOneBy({ id: statusId })
        : await statusRepository.findOneBy({
            key: DefaultTaskStatusKey.NOT_SET,
          });

      const newSubtask = subtaskRepository.create({
        title,
        description,
        submissionType,
        task,
        assignee,
        status,
      });

      if (ordinal) {
        newSubtask.ordinal = parseInt(ordinal);
      } else {
        const ordinal =
          Math.max(...task.subtasks?.map((s) => s.ordinal), 0) + 1;
        newSubtask.ordinal = ordinal;
      }

      await subtaskRepository.save(newSubtask);
      res.status(201).json({ message: "Subtask created successfully" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async reorderSubtasks(req: Request, res: Response) {
    try {
      const { taskId } = req.params;
      const { subtasks } = req.body; // expected to be like this: [{subtaskId: id, ordinal: ordinal}]

      if (!taskId || !subtasks || !Array.isArray(subtasks)) {
        res.status(400).json({
          message: "taskId is needed as well as the subtasks array",
        });
        return;
      }

      if (
        subtasks.some(
          (subtask) =>
            !subtask ||
            typeof subtask.id !== "number" ||
            typeof subtask.ordinal !== "number"
        )
      ) {
        res
          .status(400)
          .json({ message: "Each subtask must have a valid id and ordinal" });
        return;
      }

      const subtaskRepository = AppDataSource.getRepository(Subtask);
      const subtaskIds = subtasks.map((subtask) => subtask.id);

      const subtasksToUpdate = await subtaskRepository.find({
        where: {
          task: { id: parseInt(taskId) }, //checking to ensure that we update subtasks only from the correct task;
          id: In(subtaskIds),
        },
        relations: ["task"],
      });

      const updatedSubtasks = subtasksToUpdate.map((subtask) => {
        const matchingSubtask = subtasks.find((p) => p.id === subtask.id);
        if (matchingSubtask) {
          subtask.ordinal = matchingSubtask.ordinal;
        }
        return subtask;
      });

      await subtaskRepository.save(updatedSubtasks);

      res.status(200).json({ message: "subtasks successfully reordered" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async submitSubtask(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { storageType, ownerId } = req.body;
      const fileData = req.file;
      const subtaskRepository = AppDataSource.getRepository(Subtask);
      const fileRepository = AppDataSource.getTreeRepository(FileItem);
      const taskStatusRepository = AppDataSource.getRepository(TaskStatus);
      const taskCompletionFileRepo =
        AppDataSource.getRepository(TaskCompletionFile);
      const subtask = await subtaskRepository.findOne({
        where: { id: parseInt(id) },
        relations: ["status", "task"],
      });
      const userRepository = AppDataSource.getRepository(User);

      if (!subtask) {
        res.status(404).json({ message: "subtask not found" });
        return;
      }

      if (
        subtask.status?.key === DefaultTaskStatusKey.DONE ||
        subtask.status?.key === DefaultTaskStatusKey.IN_VERIFICATION
      ) {
        res.status(400).json({
          message: `Subtask with status "${subtask.status?.name}" cannot be submitted`,
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

      if (subtask.submissionType === SubmissionType.FILE_UPLOAD && !fileData) {
        res
          .status(400)
          .json({ message: "You must upload a file to submit this subtask." });
        return;
      }

      if (subtask.submissionType === SubmissionType.FILE_UPLOAD && fileData) {
        const resource = await AppDataSource.getRepository(Resource).findOne({
          where: { type: ResourceType.SUBTASK, entityId: subtask.id },
          relations: ["correspondingFolder"],
        });

        if (!resource) {
          res.status(404).json({
            message: "No resource corresponding to the subtask found.",
          });
          return;
        }

        const correspondingFolder = resource.correspondingFolder;

        if (!correspondingFolder) {
          res.status(404).json({
            message: `Something is wrong with this subtask (subtask id: ${subtask.id}). No task corresponding folder found.`,
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
          subtask: subtask,
        });

        subtask.taskCompletionFile = taskCompletionFile;
      }

      subtask.submissionDate = new Date();
      const newStatus = await taskStatusRepository.findOne({
        where: { key: DefaultTaskStatusKey.DONE },
      });

      if (!newStatus) {
        res.status(500).json({
          message: `Task status with key ${DefaultTaskStatusKey.DONE} not found in the database. Something is wrong with the project`,
        });
        return;
      }

      subtask.status = newStatus;

      await subtaskRepository.save(subtask);

      res.status(200).json({
        message: `Subtask sucessfully submitted`,
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

  static async updateSubtask(req: Request, res: Response) {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ message: "Subtask id is required" });
      return;
    }

    const { title, description, submissionType, assigneeId, statusId } =
      req.body;

    try {
      const subtaskRepository = AppDataSource.getRepository(Subtask);
      const userRepository = AppDataSource.getRepository(User);
      const statusRepository = AppDataSource.getRepository(TaskStatus);

      const subtask = await subtaskRepository.findOne({
        where: { id: parseInt(id) },
        relations: ["assignee", "status", "task"],
      });

      if (!subtask) {
        res.status(404).json({ message: "Subtask not found" });
        return;
      }

      if (title) subtask.title = title;
      if (description !== undefined) subtask.description = description;
      if (submissionType) subtask.submissionType = submissionType;

      if (assigneeId !== undefined) {
        subtask.assignee = assigneeId
          ? await userRepository.findOneBy({ id: assigneeId })
          : null;
      }

      if (statusId !== undefined) {
        subtask.status = statusId
          ? await statusRepository.findOneBy({ id: statusId })
          : null;
      }

      await subtaskRepository.save(subtask);

      res.status(200).json({ message: "Subtask updated successfully" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async deleteSubtask(req: Request, res: Response) {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ message: "Subtask id is required" });
      return;
    }

    try {
      const subtaskRepository = AppDataSource.getRepository(Subtask);
      const subtask = await subtaskRepository.findOneBy({ id: parseInt(id) });

      if (!subtask) {
        res.status(404).json({ message: "Subtask not found" });
        return;
      }

      await subtaskRepository.remove(subtask);

      res.status(200).json({ message: "Subtask deleted successfully" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }
}
