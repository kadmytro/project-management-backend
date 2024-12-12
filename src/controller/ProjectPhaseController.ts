import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { ProjectPhase } from "../entity/ProjectPhase";
import { Project } from "../entity/Project";
import { FileItem } from "../entity/FileItem";
import { In } from "typeorm";
import { Task } from "../entity/Task";
import { getErrorDetails } from "../utils/errorFormatter";

export class ProjectPhaseController {
  static async getProjectPhaseById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Project phase id is required" });
        return;
      }

      const projectPhaseRepository = AppDataSource.getRepository(ProjectPhase);
      const phase = await projectPhaseRepository.findOne({
        where: { id: parseInt(id) },
        relations: ["project", "tasks"],
      });

      if (!phase) {
        res.status(404).json({ message: "Project phase not found" });
        return;
      }

      res.status(200).json(phase);
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async getProjectPhaseTasks(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Project phase id is required" });
        return;
      }

      const projectPhaseRepository = AppDataSource.getRepository(ProjectPhase);

      const tasksRepository = AppDataSource.getRepository(Task);
      const tasks = await tasksRepository.find({
        where: { projectPhase: { id: parseInt(id) } },
        relations: [
          "status",
          "recurrenceFrequency",
          "assignee",
          "assigneeRole",
          "verifier",
          "verifierRole",
          "project",
          "projectPhase",
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

  static async createProjectPhase(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { name, description, startDate, endDate, ordinal } = req.body;

      if (!projectId) {
        res.status(400).json({ message: "Project id not provided" });
        return;
      }

      if (!name) {
        res
          .status(400)
          .json({ message: "Name is mandatory to create a project phase" });
        return;
      }

      const projectRepository = AppDataSource.getRepository(Project);
      const projectPhaseRepository = AppDataSource.getRepository(ProjectPhase);

      const project = await projectRepository.findOne({
        where: { id: parseInt(projectId) },
        relations: ["tasks", "phases"],
      });

      if (!project) {
        res.status(404).json({ message: "Project not found" });
        return;
      }

      const newPhase = projectPhaseRepository.create({
        project,
        name,
        description,
        startDate,
        endDate,
      });

      if (ordinal) {
        newPhase.ordinal = parseInt(ordinal);
      } else {
        const ordinal =
          Math.max(...project.phases?.map((p) => p.ordinal), 0) + 1;
        newPhase.ordinal = ordinal;
      }

      await projectPhaseRepository.save(newPhase);

      res
        .status(201)
        .json({ message: "Project phase created successfully", newPhase });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async reorderPhases(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { phases } = req.body; // expected to be like this: [{id: phaseId, ordinal: ordinal}]

      if (!projectId || !phases || !Array.isArray(phases)) {
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

      const phaseRepository = AppDataSource.getRepository(ProjectPhase);
      const phaseIds = phases.map((phase) => phase.id);

      const phasesToUpdate = await phaseRepository.find({
        where: { project: { id: parseInt(projectId) }, id: In(phaseIds) }, //checking to ensure that we update phases only from the correct project;
      });

      const updatedPhases = phasesToUpdate.map((phase) => {
        const matchingPhase = phases.find((p) => p.id === phase.id);
        if (matchingPhase) {
          phase.ordinal = matchingPhase.ordinal;
        }
        return phase;
      });

      await phaseRepository.save(updatedPhases);

      res.status(200).json({ message: "phases successfully reordered" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async updateProjectPhase(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Project phase id is required" });
        return;
      }

      const { name, description, startDate, endDate, ordinal } = req.body;

      const projectPhaseRepository = AppDataSource.getRepository(ProjectPhase);
      const phase = await projectPhaseRepository.findOne({
        where: { id: parseInt(id) },
        relations: ["project"],
      });

      if (!phase) {
        res.status(404).json({ message: "Project phase not found" });
        return;
      }

      if (name) {
        phase.name = name;
      }

      if (description !== undefined) {
        phase.description = description;
      }

      if (startDate !== undefined) {
        phase.startDate = startDate ? new Date(startDate) : null;
      }

      if (endDate !== undefined) {
        phase.endDate = endDate ? new Date(endDate) : null;
      }

      if (ordinal && typeof ordinal === "number") {
        phase.ordinal = ordinal;
      }

      await projectPhaseRepository.save(phase);

      res
        .status(200)
        .json({ message: "Project phase updated successfully", phase });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async deleteProjectPhase(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Project phase id is required" });
        return;
      }

      const projectPhaseRepository = AppDataSource.getRepository(ProjectPhase);
      const phase = await projectPhaseRepository.findOneBy({
        id: parseInt(id),
      });

      if (!phase) {
        res.status(404).json({ message: "Project phase not found" });
        return;
      }

      await projectPhaseRepository.remove(phase);

      res.status(200).json({ message: "Project phase deleted successfully" });
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
