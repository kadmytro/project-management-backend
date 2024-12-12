import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { ProjectRole } from "../entity/ProjectRole";
import { Project } from "../entity/Project";
import { LocalPermissionController } from "./LocalPermissionController";
import { User } from "../entity/User";
import { In } from "typeorm";
import { Task } from "../entity/Task";
import { getErrorDetails } from "../utils/errorFormatter";
import { getProjectRolePermissions } from "../service/permissionService";

export class ProjectRoleController {
  static async getProjectId(roleId: string) {
    const projectRoleRepository = AppDataSource.getRepository(ProjectRole);
    if (!roleId) {
      return null;
    }

    const role = await projectRoleRepository.findOne({
      where: { id: parseInt(roleId) },
      relations: ["project"],
    });

    if (!role) {
      return null;
    }

    return role.project.id;
  }

  static async getProjectRoleById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Role id is required" });
        return;
      }

      const projectRoleRepository = AppDataSource.getRepository(ProjectRole);
      const role = await projectRoleRepository.findOne({
        where: { id: parseInt(id) },
        relations: [
          "assignedUsers",
          "assignedTasks",
          "verifyingTasks",
          "localPermissions",
        ],
      });

      if (!role) {
        res.status(404).json({ message: "Project role not found" });
        return;
      }

      res.status(200).json(role.getDetails());
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async getAssignedTasks(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Role id is required" });
        return;
      }

      const projectRoleRepository = AppDataSource.getRepository(ProjectRole);
      const role = await projectRoleRepository.findOne({
        where: { id: parseInt(id) },
        relations: ["assignedTasks"],
      });

      if (!role) {
        res.status(404).json({ message: "Project role not found" });
        return;
      }

      res.status(200).json(role.assignedTasks?.map((t) => t.getDetails()));
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async getVerifyingTasks(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Role id is required" });
        return;
      }

      const projectRoleRepository = AppDataSource.getRepository(ProjectRole);
      const role = await projectRoleRepository.findOne({
        where: { id: parseInt(id) },
        relations: ["verifyingTasks"],
      });

      if (!role) {
        res.status(404).json({ message: "Project role not found" });
        return;
      }

      res.status(200).json(role.verifyingTasks?.map((t) => t.getDetails()));
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async getProjectRoleUsers(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Role id is required" });
        return;
      }

      const projectRoleRepository = AppDataSource.getRepository(ProjectRole);
      const role = await projectRoleRepository.findOne({
        where: { id: parseInt(id) },
        relations: ["assignedUsers"],
      });

      if (!role) {
        res.status(404).json({ message: "Project role not found" });
        return;
      }

      res.status(200).json(role.assignedUsers.map((u) => u.getDetails()));
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async getProjectRolePermissions(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Role id is required" });
        return;
      }

      const rolePermissions = await getProjectRolePermissions(id);

      res.status(200).json(rolePermissions);
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async createProjectRole(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { name, description, isManagingTeam } = req.body;

      if (!projectId) {
        res.status(400).json({ message: "Project id not provided" });
        return;
      }

      const projectRepository = AppDataSource.getRepository(Project);
      const projectRoleRepository = AppDataSource.getRepository(ProjectRole);

      const project = await projectRepository.findOneBy({
        id: parseInt(projectId),
      });

      if (!project) {
        res.status(404).json({ message: "Project not found" });
        return;
      }

      const newRole = projectRoleRepository.create({
        project,
        name,
        description,
      });

      if (typeof isManagingTeam === "boolean") {
        newRole.isManagingTeam = isManagingTeam;
      }

      await projectRoleRepository.save(newRole);

      res
        .status(201)
        .json({ message: "Project role created successfully", newRole });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async updateProjectRoleUsers(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Role id is required" });
        return;
      }

      const { addUsers, removeUsers } = req.body;

      const projectRoleRepository = AppDataSource.getRepository(ProjectRole);
      const projectRepository = AppDataSource.getRepository(Project);
      const userRepository = AppDataSource.getRepository(User);
      const role = await projectRoleRepository.findOne({
        where: { id: parseInt(id) },
        relations: ["assignedUsers", "assignedTasks", "project"],
      });

      if (!role) {
        res.status(404).json({ message: "Project role not found" });
        return;
      }

      const project = await projectRepository.findOne({
        where: { id: role.project.id },
        relations: ["managingTeam", "participantsTeam"],
      });

      if (!project) {
        res.status(404).json({ message: "Project not found" });
        return;
      }

      if (addUsers && Array.isArray(addUsers)) {
        const usersToAdd = await userRepository.find({
          where: { id: In(addUsers) },
          relations: ["managingProjects", "participatingInProjects"],
        });

        role.assignedUsers.push(
          ...usersToAdd.filter((user) => !role.assignedUsers.includes(user))
        );

        if (role.isManagingTeam) {
          if (
            project.participantsTeam.filter((u) => addUsers.includes(u.id))
              .length > 0
          ) {
            res.status(400).json({
              message:
                "User cannot be assigned a managing role for the project as they are already participating.",
            });
            return;
          }
          project.managingTeam.push(
            ...usersToAdd.filter((user) => !project.managingTeam.includes(user))
          );
        } else {
          if (
            project.managingTeam.filter((u) => addUsers.includes(u.id)).length >
            0
          ) {
            res.status(400).json({
              message:
                "User cannot be assigned a participating role for the project as they are already managing.",
            });
            return;
          }
          project.participantsTeam.push(
            ...usersToAdd.filter(
              (user) => !project.participantsTeam.includes(user)
            )
          );
        }
      }

      if (removeUsers && Array.isArray(removeUsers)) {
        if (
          removeUsers.some(
            (uid) => !role.assignedUsers.some((u) => u.id === uid)
          )
        ) {
          res
            .status(400)
            .json({ message: "no all the users in the array have this role" });
          return;
        }

        role.assignedUsers = role.assignedUsers.filter(
          (user) => !removeUsers.includes(user.id)
        );
      }

      await projectRoleRepository.save(role);
      await projectRepository.save(project);
      res
        .status(200)
        .json({ message: "Project role users updated successfully" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async updateProjectRolePermissions(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Role id is required" });
        return;
      }

      const { addLocalPermissions, removeLocalPermissions } = req.body;

      const projectRoleRepository = AppDataSource.getRepository(ProjectRole);
      const role = await projectRoleRepository.findOne({
        where: { id: parseInt(id) },
      });

      if (!role) {
        res.status(404).json({ message: "Project role not found" });
        return;
      }

      if (addLocalPermissions || removeLocalPermissions) {
        await LocalPermissionController.updateRolePermissions(req, res);
      }

      if (!res.headersSent) {
        res
          .status(200)
          .json({ message: "Project role permissions updated successfully" });
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

  static async updateProjectRoleTasks(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Role id is required" });
        return;
      }

      const { addTasks, removeTasks, addVerifyingTasks, removeVerifyingTasks } =
        req.body;

      const projectRoleRepository = AppDataSource.getRepository(ProjectRole);
      const taskRepository = AppDataSource.getRepository(Task);
      const role = await projectRoleRepository.findOne({
        where: { id: parseInt(id) },
        relations: [
          "assignedUsers",
          "assignedTasks",
          "verifyingTasks",
          "project",
        ],
      });

      if (!role) {
        res.status(404).json({ message: "Project role not found" });
        return;
      }

      if (addTasks && Array.isArray(addTasks)) {
        const tasksToAdd = await taskRepository.find({
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
        const tasksToAdd = await taskRepository.find({
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
        role.assignedTasks = role.verifyingTasks.filter(
          (task) => !removeVerifyingTasks.includes(task.id)
        );
      }
      await projectRoleRepository.save(role);

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

  static async updateProjectRole(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Role id is required" });
        return;
      }

      const { name, description, isManagingTeam } = req.body;

      const projectRoleRepository = AppDataSource.getRepository(ProjectRole);
      const role = await projectRoleRepository.findOne({
        where: { id: parseInt(id) },
        relations: ["verifyingTasks"],
      });

      if (!role) {
        res.status(404).json({ message: "Project role not found" });
        return;
      }

      if (name) role.name = name;
      if (description !== undefined) {
        role.description = description;
      }

      if (isManagingTeam !== undefined) {
        if (isManagingTeam) {
          role.isManagingTeam = isManagingTeam;
        } else {
          role.verifyingTasks = [];
          role.isManagingTeam = false;
        }
      }

      await projectRoleRepository.save(role);

      if (!res.headersSent) {
        res.status(200).json({ message: "Project role updated successfully" });
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

  static async deleteProjectRole(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Role id is required" });
        return;
      }

      const projectRoleRepository = AppDataSource.getRepository(ProjectRole);
      const role = await projectRoleRepository.findOneBy({ id: parseInt(id) });

      if (!role) {
        res.status(404).json({ message: "Project role not found" });
        return;
      }

      await projectRoleRepository.remove(role);

      res.status(200).json({ message: "Project role deleted successfully" });
    } catch (error) {
      res.status(500).json({
        message: "Internal server error",
        error: getErrorDetails(error),
      });
    }
  }
}
