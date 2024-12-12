import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { In } from "typeorm";
import { ProjectTemplate } from "../entity/ProjectTemplate";
import { TemplateProjectPhase } from "../entity/TemplateProjectPhase";
import { TemplateTask } from "../entity/TemplateTask";
import { RecurrenceFrequency } from "../entity/RecurrenceFrequency";
import { TemplateProjectRole } from "../entity/TemplateProjectRole";
import { getErrorDetails } from "../utils/errorFormatter";
import { isValidSubmissionType } from "../type/SubmissionType";
import { isValidTaskType, TaskType } from "../type/TaskType";
import { RecurrenceFrequencyController } from "./RecurrenceFrequencyController";

export class TemplateController {
  static async getAllProjectTemplates(req: Request, res: Response) {
    try {
      const templatesRepository = AppDataSource.getRepository(ProjectTemplate);
      const templates = await templatesRepository.find();
      res.status(200).json(templates.map((template) => template.getDetails()));
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async getProjectTemplateById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Projet template id is required" });
        return;
      }

      const templatesRepository = AppDataSource.getRepository(ProjectTemplate);
      const projectTemplate = await templatesRepository.findOne({
        where: { id: parseInt(id) },
        relations: ["phases", "tasks", "tasks.projectPhase", "projectRoles"],
      });

      if (!projectTemplate) {
        res.status(404).json({ message: "Project template not found" });
        return;
      }

      res.status(200).json(projectTemplate.getDetails());
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async createProjectTemplate(req: Request, res: Response) {
    try {
      const { name, description } = req.body;

      if (!name) {
        res.status(400).json({ message: "Project template name is required" });
        return;
      }

      const projectTemplateRepository =
        AppDataSource.getRepository(ProjectTemplate);

      const newProjectTemplate = projectTemplateRepository.create({
        name,
        description,
      });

      await projectTemplateRepository.save(newProjectTemplate);

      res.status(201).json({
        message: "Project template created successfully",
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

  static async updateProjectTemplate(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Projet template id is required" });
        return;
      }

      const { name, description, isArchided } = req.body;

      const projectTemplateRepository =
        AppDataSource.getRepository(ProjectTemplate);

      const projectTemplate = await projectTemplateRepository.findOne({
        where: { id: parseInt(id) },
        relations: ["phases", "tasks"],
      });

      if (!projectTemplate) {
        res.status(404).json({ message: "Project template not found" });
        return;
      }

      if (name) projectTemplate.name = name;
      if (description !== undefined) {
        projectTemplate.description = description;
      }

      if (isArchided !== undefined) {
        projectTemplate.isArchived = !!isArchided;
      }

      await projectTemplateRepository.save(projectTemplate);

      res.status(200).json({
        message: "Project template updated successfully",
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

  static async deleteProjectTemplate(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Projet template id is required" });
        return;
      }

      const projectTemplateRepository =
        AppDataSource.getRepository(ProjectTemplate);
      const projectTemplate = await projectTemplateRepository.findOneBy({
        id: parseInt(id),
      });

      if (!projectTemplate) {
        res.status(404).json({ message: "Project template not found" });
        return;
      }

      await projectTemplateRepository.remove(projectTemplate);

      res
        .status(200)
        .json({ message: "Project template deleted successfully" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async getProjectTemplatePhases(req: Request, res: Response) {
    try {
      const { projectTemplateId } = req.params;

      if (!projectTemplateId) {
        res.status(400).json({ message: "Project template id is required" });
        return;
      }

      const templatePhaseRepository =
        AppDataSource.getRepository(TemplateProjectPhase);
      const projectPhaseTemplates = await templatePhaseRepository.find({
        where: { project: { id: parseInt(projectTemplateId) } },
      });

      res
        .status(200)
        .json(projectPhaseTemplates.map((phase) => phase.getDetails()));
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async getTemplatePhase(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Template phase id is required" });
        return;
      }

      const templatePhaseRepository =
        AppDataSource.getRepository(TemplateProjectPhase);
      const projectPhaseTemplate = await templatePhaseRepository.findOne({
        where: { id: parseInt(id) },
        relations: ["project", "tasks"],
      });

      if (!projectPhaseTemplate) {
        res.status(404).json({ message: "Project template phase not found" });
        return;
      }

      res.status(200).json(projectPhaseTemplate.getDetails());
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async createTemplatePhase(req: Request, res: Response) {
    try {
      const { projectTemplateId } = req.params;
      const { name, description, ordinal } = req.body;

      if (!projectTemplateId) {
        res.status(400).json({ message: "Project template id is required" });
        return;
      }

      if (!name) {
        res.status(400).json({ message: "Project template name is required" });
        return;
      }

      const templatePhaseRepository =
        AppDataSource.getRepository(TemplateProjectPhase);
      const projectTemplateRepository =
        AppDataSource.getRepository(ProjectTemplate);

      const projectTemplate = await projectTemplateRepository.findOne({
        where: { id: parseInt(projectTemplateId) },
        relations: ["tasks", "phases"],
      });

      if (!projectTemplate) {
        res.status(404).json({
          message: `Could not create a template phase. Project temlpate not found`,
        });
        return;
      }

      const newProjectPhaseTemplate = templatePhaseRepository.create({
        name,
        description,
      });

      if (ordinal) {
        newProjectPhaseTemplate.ordinal = parseInt(ordinal);
      } else {
        const ordinal =
          Math.max(...projectTemplate.phases?.map((p) => p.ordinal), 0) + 1;
        newProjectPhaseTemplate.ordinal = ordinal;
      }

      newProjectPhaseTemplate.project = projectTemplate;

      await templatePhaseRepository.save(newProjectPhaseTemplate);

      res.status(201).json({
        message: "Template phase created successfully",
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

  static async reorderTemplatePhases(req: Request, res: Response) {
    try {
      const { projectTemplateId } = req.params;
      const { phases } = req.body; // expected to be like this: [{id: phaseId, ordinal: ordinal}]

      if (!projectTemplateId || !phases || !Array.isArray(phases)) {
        res
          .status(400)
          .json({ message: "project Id needed as well as the phases array" });
        return;
      }

      if (
        phases.some(
          (phase) =>
            !phase ||
            typeof phase.id !== "number" ||
            typeof phase.ordinal !== "number"
        )
      ) {
        res
          .status(400)
          .json({ message: "Each phase must have a valid id and ordinal" });
        return;
      }

      const phaseRepository = AppDataSource.getRepository(TemplateProjectPhase);
      const phaseIds = phases.map((phase) => phase.id);

      const phasesToUpdate = await phaseRepository.find({
        where: {
          project: { id: parseInt(projectTemplateId) },
          id: In(phaseIds),
        }, //checking to ensure that we update phases only from the correct project;
      });

      const updatedPhases = phasesToUpdate.map((phase) => {
        const matchingPhase = phases.find((p) => p.id === phase.id);
        if (matchingPhase) {
          phase.ordinal = matchingPhase.ordinal;
        }
        return phase;
      });

      await phaseRepository.save(updatedPhases);

      res.status(200).json({ message: "Phases successfully reordered" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async updateTemplatePhase(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Template phase id is required" });
        return;
      }

      const { name, description, ordinal } = req.body;

      const templatePhaseRepository =
        AppDataSource.getRepository(TemplateProjectPhase);

      const templatePhase = await templatePhaseRepository.findOne({
        where: { id: parseInt(id) },
      });

      if (!templatePhase) {
        res.status(404).json({
          message: `Could not update the template phase. Temlpate phase not found`,
        });
        return;
      }

      if (name) {
        templatePhase.name = name;
      }

      if (description !== undefined) {
        templatePhase.description = description;
      }

      if (ordinal && typeof ordinal === "number") {
        templatePhase.ordinal = ordinal;
      }

      await templatePhaseRepository.save(templatePhase);

      res.status(201).json({
        message: "Project template updated successfully",
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

  static async deleteTemplatePhase(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Template phase id is required" });
        return;
      }

      const templatePhaseRepository =
        AppDataSource.getRepository(TemplateProjectPhase);

      const templatePhase = await templatePhaseRepository.findOne({
        where: { id: parseInt(id) },
      });

      if (!templatePhase) {
        res.status(404).json({
          message: `Temlpate phase not found`,
        });
        return;
      }

      await templatePhaseRepository.remove(templatePhase);

      res
        .status(200)
        .json({ message: "Project template phase deleted successfully" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async getTemplateTask(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Template task id is required" });
        return;
      }

      const templateTaskRepository = AppDataSource.getRepository(TemplateTask);
      const taskTemplate = await templateTaskRepository.findOne({
        where: { id: parseInt(id) },
        relations: [
          "recurrenceFrequency",
          "assigneeRole",
          "verifierRole",
          "project",
          "projectPhase",
        ],
      });

      if (!taskTemplate) {
        res.status(404).json({ message: "Task template not found" });
        return;
      }

      res.status(200).json(taskTemplate.getDetails());
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async createTemplateTask(req: Request, res: Response) {
    try {
      const { projectTemplateId } = req.params;
      const {
        title,
        description,
        isRecurring,
        submissionType,
        type,
        recurrenceDetails,
        projectPhaseId,
        assigneeRoleId,
        verifierRoleId,
        ordinal,
      } = req.body;
      const templateTaskRepository = AppDataSource.getRepository(TemplateTask);
      const projectTemplateRepository =
        AppDataSource.getRepository(ProjectTemplate);
      const templatePhaseRepository =
        AppDataSource.getRepository(TemplateProjectPhase);
      const templateRoleRepository =
        AppDataSource.getRepository(TemplateProjectRole);

      if (!title) {
        res.status(404).json({ message: "Task title is mandataory" });
        return;
      }

      const projectTemplatePhase = projectPhaseId
        ? await templatePhaseRepository.findOne({
            where: { id: parseInt(projectPhaseId) },
            relations: ["project", "tasks"],
          })
        : null;

      const projectTemplate = projectTemplatePhase
        ? projectTemplatePhase.project
        : projectTemplateId
        ? await projectTemplateRepository.findOne({
            where: { id: parseInt(projectTemplateId) },
            relations: ["phases", "tasks"],
          })
        : null;

      if (!projectTemplate) {
        res.status(404).json({ message: "Project template not found" });
        return;
      }

      if (isRecurring && !recurrenceDetails) {
        res.status(400).json({
          message: "Recurrence details are required for recurring tasks",
        });
        return;
      }

      const assigneeRole = assigneeRoleId
        ? await templateRoleRepository.findOne({
            where: {
              id: parseInt(assigneeRoleId),
              project: { id: projectTemplate.id },
            },
          })
        : null;

      if (assigneeRoleId && !assigneeRole) {
        res.status(400).json({
          message: "Assignee role not found in this project template",
        });
        return;
      }

      const verifierRole = verifierRoleId
        ? await templateRoleRepository.findOne({
            where: {
              id: parseInt(verifierRoleId),
              project: { id: projectTemplate.id },
              isManagingTeam: true,
            },
          })
        : null;

      if (verifierRoleId && !verifierRole) {
        res.status(400).json({
          message:
            "Verifier role not found in this project template or it's not part of the managing team",
        });
        return;
      }

      const newTemplateTask = templateTaskRepository.create({
        title,
        description,
        project: projectTemplate,
      });

      if (projectTemplatePhase) {
        newTemplateTask.projectPhase = projectTemplatePhase;
      }

      if (submissionType && isValidSubmissionType(submissionType)) {
        newTemplateTask.submissionType = submissionType;
      }

      if (type && isValidTaskType(type)) {
        newTemplateTask.type = type;
      }

      if (assigneeRole) {
        newTemplateTask.assigneeRole = assigneeRole;
      }

      if (verifierRole) {
        newTemplateTask.verifierRole = verifierRole;
      }

      if (ordinal) {
        newTemplateTask.ordinal = parseInt(ordinal);
      } else {
        const ordinal = projectTemplatePhase
          ? Math.max(...projectTemplatePhase.tasks?.map((t) => t.ordinal), 0) +
            1
          : Math.max(...projectTemplate.tasks?.map((t) => t.ordinal), 0) + 1;
        newTemplateTask.ordinal = ordinal;
      }

      const savedTemplateTask = await templateTaskRepository.save(
        newTemplateTask
      );

      try {
        if (isRecurring && recurrenceDetails) {
          const frequencyRepository =
            AppDataSource.getRepository(RecurrenceFrequency);
          const newFrequency =
            RecurrenceFrequencyController.createRecurrenceFrequencyEntity(
              recurrenceDetails
            );
          newFrequency.templateTask = savedTemplateTask;
          await frequencyRepository.save(newFrequency);
          savedTemplateTask.recurrenceFrequency = newFrequency;
          savedTemplateTask.isRecurring = true;
        }
      } catch (error) {
        await templateTaskRepository.remove(savedTemplateTask);
        res.status(400).json({
          message: "Error creating template task",
          error: getErrorDetails(error),
        });
        return;
      }

      await templateTaskRepository.save(savedTemplateTask);

      res.status(201).json({ message: "Template task created successfully" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async reorderTemplateTasks(req: Request, res: Response) {
    try {
      const { projectTemplateId } = req.params;
      const { tasks } = req.body; // expected to be like this: [{id: taskId, ordinal: ordinal}]

      if (!projectTemplateId || !tasks || !Array.isArray(tasks)) {
        res.status(400).json({
          message: "projectTemplateId is needed as well as the tasks array",
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

      const templateTaskRepository = AppDataSource.getRepository(TemplateTask);
      const taskIds = tasks.map((task) => task.id);

      const tasksToUpdate = await templateTaskRepository.find({
        where: {
          project: { id: parseInt(projectTemplateId) }, //checking to ensure that we update tasks only from the correct project template;
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

      await templateTaskRepository.save(updatedTasks);

      res
        .status(200)
        .json({ message: "Template tasks successfully reordered" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async updateTemplateTask(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Template task id is required" });
        return;
      }

      const {
        title,
        description,
        submissionType,
        type,
        isRecurring,
        projectPhaseId,
        assigneeRoleId,
        verifierRoleId,
        recurrenceDetails,
        ordinal,
      } = req.body;
      const templateTaskRepository = AppDataSource.getRepository(TemplateTask);
      const templatePhaseRepository =
        AppDataSource.getRepository(TemplateProjectPhase);
      const templateRoleRepository =
        AppDataSource.getRepository(TemplateProjectRole);

      if (type && !isValidTaskType(type)) {
        res.status(400).json({ message: "Invalid task type" });
        return;
      }

      if (submissionType && !isValidSubmissionType(submissionType)) {
        res.status(400).json({ message: "Invalid task submission type" });
        return;
      }

      const templateTask = await templateTaskRepository.findOne({
        where: { id: parseInt(id) },
        relations: [
          "recurrenceFrequency",
          "assigneeRole",
          "verifierRole",
          "project",
          "projectPhase",
        ],
      });

      if (!templateTask) {
        res.status(404).json({ message: "template task not found" });
        return;
      }

      if (type) {
        templateTask.type = type;
      }

      if (title) {
        templateTask.title = title;
      }

      if (description !== undefined) {
        templateTask.description = description;
      }

      if (submissionType) {
        templateTask.submissionType = submissionType;
      }

      if (isRecurring !== undefined) {
        templateTask.isRecurring = isRecurring;
      }

      if (assigneeRoleId !== undefined) {
        const assigneeRole = assigneeRoleId
          ? await templateRoleRepository.findOne({
              where: {
                id: parseInt(assigneeRoleId),
                project: { id: templateTask.project.id },
              },
            })
          : null;

        if (assigneeRoleId && !assigneeRole) {
          res.status(400).json({
            message:
              "The assignee role is not a part of the project or not found and cannot be assigned to this task",
          });
          return;
        }
        templateTask.assigneeRole = assigneeRole;
      }

      if (verifierRoleId !== undefined) {
        const verifierRole = verifierRoleId
          ? await templateRoleRepository.findOne({
              where: {
                id: parseInt(verifierRoleId),
                project: { id: templateTask.project.id },
                isManagingTeam: true,
              },
            })
          : null;

        if (verifierRoleId && !verifierRole) {
          res.status(400).json({
            message:
              "The verifier role is not a part of the project or not found, or not a part of a managing team and cannot be assigned to verify this task",
          });
          return;
        }
      }

      if (projectPhaseId !== undefined) {
        const projectPhase = projectPhaseId
          ? await templatePhaseRepository.findOne({
              where: {
                id: parseInt(projectPhaseId),
                project: { id: templateTask.project.id },
              },
            })
          : null;

        if (projectPhaseId && !projectPhase) {
          res.status(400).json({
            message: "Project phase with such id not found in this project.",
          });
          return;
        }

        templateTask.projectPhase = projectPhase;
      }

      if (
        (isRecurring !== undefined &&
          templateTask.isRecurring !== isRecurring) ||
        recurrenceDetails ||
        templateTask.type !== type
      ) {
        templateTask.isRecurring = false;
        templateTask.recurrenceFrequency = null;
      }

      if (isRecurring && recurrenceDetails) {
        const frequencyRepository =
          AppDataSource.getRepository(RecurrenceFrequency);
        const newFrequency =
          RecurrenceFrequencyController.createRecurrenceFrequencyEntity(
            recurrenceDetails
          );

        newFrequency.templateTask = templateTask;
        await frequencyRepository.save(newFrequency);
        templateTask.recurrenceFrequency = newFrequency;
        templateTask.isRecurring = true;
      }

      if (ordinal && typeof ordinal === "number") {
        templateTask.ordinal = ordinal;
      }

      await templateTaskRepository.save(templateTask);

      res.status(201).json({ message: "Template task updated successfully" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async deleteTemplateTask(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Template task id is required" });
        return;
      }

      const templateTaskRepository = AppDataSource.getRepository(TemplateTask);

      const templateTask = await templateTaskRepository.findOne({
        where: { id: parseInt(id) },
      });

      if (!templateTask) {
        res.status(404).json({ message: "template task not found" });
        return;
      }

      await templateTaskRepository.remove(templateTask);
      res.status(200).json({ message: "Template task deleted successfully" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async getTemplateRoles(req: Request, res: Response) {
    try {
      const { projectTemplateId } = req.params;

      if (!projectTemplateId) {
        res.status(400).json({ message: "Template project id is required" });
        return;
      }

      const templateRoleRepository =
        AppDataSource.getRepository(TemplateProjectRole);
      const templateRole = await templateRoleRepository.find({
        where: { project: { id: parseInt(projectTemplateId) } },
        relations: ["project", "assignedTasks", "verifyingTasks"],
      });

      res.status(200).json(templateRole.map((role) => role.getDetails()));
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async getTemplateRole(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Template role id is required" });
        return;
      }

      const templateRoleRepository =
        AppDataSource.getRepository(TemplateProjectRole);
      const templateRole = await templateRoleRepository.findOne({
        where: { id: parseInt(id) },
        relations: ["project", "assignedTasks", "verifyingTasks"],
      });

      if (!templateRole) {
        res.status(404).json({ message: "Template role not found" });
        return;
      }

      res.status(200).json(templateRole.getDetails());
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async createTemplateRole(req: Request, res: Response) {
    try {
      const { projectTemplateId } = req.params;
      const { name, description, isManagingTeam } = req.body;

      if (!projectTemplateId) {
        res.status(400).json({ message: "Project template id is required" });
        return;
      }
      const templateRoleRepository =
        AppDataSource.getRepository(TemplateProjectRole);
      const projectTemplateRepository =
        AppDataSource.getRepository(ProjectTemplate);

      const projectTemplate = await projectTemplateRepository.findOne({
        where: { id: parseInt(projectTemplateId) },
      });

      if (!projectTemplate) {
        res
          .status(404)
          .json({ message: "Project template with such id not found" });
        return;
      }

      if (!name) {
        res.status(400).json({ message: "name is mandatory" });
        return;
      }

      const newTemplateRole = await templateRoleRepository.create({
        name,
        description,
        project: projectTemplate,
      });

      newTemplateRole.isManagingTeam = !!isManagingTeam;

      await templateRoleRepository.save(newTemplateRole);

      res
        .status(200)
        .json({ message: "Successfully created a new template role" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async updateTemplateRole(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Template role id is required" });
        return;
      }

      const { name, description, isManagingTeam } = req.body;

      const templateRoleRepository =
        AppDataSource.getRepository(TemplateProjectRole);
      const templateRole = await templateRoleRepository.findOne({
        where: { id: parseInt(id) },
        relations: ["verifyingTasks"],
      });

      if (!templateRole) {
        res.status(404).json({ message: "template role not found" });
        return;
      }

      if (name) {
        templateRole.name = name;
      }

      if (description !== undefined) {
        templateRole.description = description;
      }

      if (isManagingTeam !== undefined) {
        if (isManagingTeam) {
          templateRole.isManagingTeam = isManagingTeam;
        } else {
          templateRole.verifyingTasks = [];
          templateRole.isManagingTeam = false;
        }
      }

      await templateRoleRepository.save(templateRole);

      res
        .status(200)
        .json({ message: "Template project role successfully updated!" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async updateTemplateRoleTasks(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Template role id is required" });
        return;
      }

      const { addTasks, removeTasks, addVerifyingTasks, removeVerifyingTasks } =
        req.body;

      const projectTemplateRoleRepository =
        AppDataSource.getRepository(TemplateProjectRole);
      const templateTaskRepository = AppDataSource.getRepository(TemplateTask);
      const role = await projectTemplateRoleRepository.findOne({
        where: { id: parseInt(id) },
        relations: ["assignedTasks", "verifyingTasks", "project"],
      });

      if (!role) {
        res.status(404).json({ message: "Project template role not found" });
        return;
      }

      if (addTasks && Array.isArray(addTasks)) {
        const tasksToAdd = await templateTaskRepository.find({
          where: { id: In(addTasks), project: { id: role.project.id } },
        });

        role.assignedTasks.push(
          ...tasksToAdd.filter(
            (task) =>
              !role.assignedTasks.includes(task) &&
              !role.verifyingTasks.includes(task)
          )
        );
      }

      if (removeTasks && Array.isArray(removeTasks)) {
        role.assignedTasks = role.assignedTasks.filter(
          (task) => !removeTasks.includes(task.id)
        );
      }

      if (addVerifyingTasks && Array.isArray(addVerifyingTasks)) {
        const tasksToAdd = await templateTaskRepository.find({
          where: {
            id: In(addVerifyingTasks),
            project: { id: role.project.id },
          },
        });

        if (!role.isManagingTeam) {
          res
            .status(400)
            .json({ message: "Only managing roles can verify tasks" });
          return;
        }

        role.verifyingTasks.push(
          ...tasksToAdd.filter(
            (task) =>
              !role.verifyingTasks.includes(task) &&
              !role.assignedTasks.includes(task)
          )
        );
      }

      if (removeVerifyingTasks && Array.isArray(removeVerifyingTasks)) {
        role.verifyingTasks = role.verifyingTasks.filter(
          (task) => !removeVerifyingTasks.includes(task.id)
        );
      }
      await projectTemplateRoleRepository.save(role);

      if (!res.headersSent) {
        res
          .status(200)
          .json({ message: "Project role tasks updated successfully" });
      }
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async deleteTemplateRole(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Template role id is required" });
        return;
      }

      const templateRoleRepository =
        AppDataSource.getRepository(TemplateProjectRole);
      const templateRole = await templateRoleRepository.findOne({
        where: { id: parseInt(id) },
      });

      if (!templateRole) {
        res.status(404).json({ message: "project template role not found" });
        return;
      }

      templateRoleRepository.remove(templateRole);
      res
        .status(200)
        .json({ message: "project template role successfully deleted" });
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
