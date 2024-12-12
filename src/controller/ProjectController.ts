import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Project } from "../entity/Project";
import { User } from "../entity/User";
import { In } from "typeorm";
import { FileItem } from "../entity/FileItem";
import { getErrorDetails } from "../utils/errorFormatter";
import { ProjectRole } from "../entity/ProjectRole";
import { ProjectPhase } from "../entity/ProjectPhase";
import { UserController } from "./UserController";

export class ProjectController {
  static async getAllProjects(req: Request, res: Response) {
    try {
      const projectRepository = AppDataSource.getRepository(Project);
      const projects = await projectRepository.find({
        relations: [
          "managingTeam",
          "participantsTeam",
          "phases",
          "tasks",
          "projectRoles",
        ],
      });
      res.status(200).json(projects.map((p) => p.getDetails()));
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async getProjectById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Project id is required" });
        return;
      }

      const projectRepository = AppDataSource.getRepository(Project);
      const project = await projectRepository.findOne({
        where: { id: parseInt(id) },
        relations: [
          "managingTeam",
          "participantsTeam",
          "phases",
          "tasks",
          "tasks.projectPhase",
          "projectRoles",
        ],
      });

      if (!project) {
        res.status(404).json({ message: "Project not found" });
        return;
      }

      res.status(200).json(project.getFullDetails());
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async getProjectRoles(req: Request, res: Response) {
    try {
      const projectId = req.params["id"];

      if (!projectId) {
        res.status(400).json({ message: "Project id is required" });
        return;
      }

      const projectRoleRepository = AppDataSource.getRepository(ProjectRole);
      const roles = await projectRoleRepository.find({
        where: { project: { id: parseInt(projectId) } },
        relations: [
          "project",
          "assignedUsers",
          "assignedTasks",
          "verifyingTasks",
          "localPermissions",
        ],
      });
      if (roles) {
        res.status(200).json(roles?.map((p) => p.getDetails()));
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

  static async getProjectPhases(req: Request, res: Response) {
    try {
      const projectId = req.params["id"];

      if (!projectId) {
        res.status(400).json({ message: "Project id is required" });
        return;
      }

      const phaseRepository = AppDataSource.getRepository(ProjectPhase);
      const projectPhases = await phaseRepository.find({
        where: { project: { id: parseInt(projectId) } },
        relations: ["project", "tasks"],
      });

      if (!projectPhases) {
        res.status(400).json({ message: "Something went wrong" });
        return;
      }

      res.status(200).json(projectPhases.map((p) => p.getDetails()));
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async createProject(req: Request, res: Response) {
    try {
      const { name, description, startDate, endDate } = req.body;

      if (!name) {
        res.status(400).json({ message: "Project name is required" });
        return;
      }

      const projectRepository = AppDataSource.getRepository(Project);

      const newProject = projectRepository.create({
        name,
        description,
        startDate,
        endDate,
      });

      await projectRepository.save(newProject);

      res
        .status(201)
        .json({ message: "Project created successfully", newProject });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async updateProjectUsers(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Project id is required" });
        return;
      }

      const {
        addManagingUsers,
        removeManagingUsers,
        addParticipants,
        removeParticipants,
      } = req.body;

      const projectRepository = AppDataSource.getRepository(Project);
      const userRepository = AppDataSource.getRepository(User);

      const project = await projectRepository.findOne({
        where: { id: parseInt(id) },
        relations: ["managingTeam", "participantsTeam"],
      });

      if (!project) {
        res.status(404).json({ message: "Project not found" });
        return;
      }

      if (removeManagingUsers && Array.isArray(removeManagingUsers)) {
        project.managingTeam = project.managingTeam.filter(
          (user) => !removeManagingUsers.includes(user.id)
        );
        await UserController.removeUsersFromProjectTasks(
          removeManagingUsers,
          project.id
        );

        await UserController.removeUsersFromProjectRoles(
          removeManagingUsers,
          project.id
        );
      }

      if (removeParticipants && Array.isArray(removeParticipants)) {
        project.participantsTeam = project.participantsTeam.filter(
          (user) => !removeParticipants.includes(user.id)
        );
        await UserController.removeUsersFromProjectTasks(
          removeParticipants,
          project.id
        );

        await UserController.removeUsersFromProjectRoles(
          removeManagingUsers,
          project.id
        );
      }

      if (addManagingUsers && Array.isArray(addManagingUsers)) {
        const usersToAdd = await userRepository.find({
          where: { id: In(addManagingUsers) },
        });
        project.managingTeam.push(...usersToAdd);
      }

      if (addParticipants && Array.isArray(addParticipants)) {
        const usersToAdd = await userRepository.find({
          where: { id: In(addParticipants) },
        });
        project.participantsTeam.push(...usersToAdd);
      }

      await projectRepository.save(project);

      res
        .status(200)
        .json({ message: "Project users updated successfully", project });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async updateProject(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Project id is required" });
        return;
      }

      const { name, description, startDate, endDate, isCompleted, isArchided } =
        req.body;

      const projectRepository = AppDataSource.getRepository(Project);

      const project = await projectRepository.findOne({
        where: { id: parseInt(id) },
      });

      if (!project) {
        res.status(404).json({ message: "Project not found" });
        return;
      }

      if (name) project.name = name;
      if (description !== undefined) {
        project.description = description;
      }

      if (startDate !== undefined) {
        project.startDate = startDate ? new Date(startDate) : null;
      }

      if (endDate !== undefined) {
        project.endDate = endDate ? new Date(endDate) : null;
      }

      if (isCompleted !== undefined) {
        project.isCompleted = !!isCompleted;
      }

      if (isArchided !== undefined) {
        project.isArchived = !!isArchided;
      }

      await projectRepository.save(project);

      res
        .status(200)
        .json({ message: "Project updated successfully", project });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async deleteProject(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Project id is required" });
        return;
      }

      const projectRepository = AppDataSource.getRepository(Project);
      const project = await projectRepository.findOneBy({ id: parseInt(id) });

      if (!project) {
        res.status(404).json({ message: "Project not found" });
        return;
      }

      await projectRepository.remove(project);

      res.status(200).json({ message: "Project deleted successfully" });
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
