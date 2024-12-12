import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import {
  hashPassword,
  comparePassword,
  generateToken,
} from "../service/authService";
import { User } from "../entity/User";
import { Position } from "../entity/Position";
import { UserGroup } from "../entity/UserGroup";
import { In } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { sendEmail } from "../utils/sendEmail";
import { ProjectRole } from "../entity/ProjectRole";
import { getUserPermissions } from "../service/permissionService";
import { getErrorDetails } from "../utils/errorFormatter";
import { GlobalPermissionController } from "./GlobalPermissionsController";
import { LocalPermissionController } from "./LocalPermissionController";
import { Task } from "../entity/Task";
import { Subtask } from "../entity/Subtask";
import { FlatCache } from "flat-cache";
import crypto from "crypto";

const cache = new FlatCache();
interface CacheData {
  userId: string;
  expiresAt: number;
}

export class UserController {
  static async register(req: Request, res: Response) {
    try {
      const { username, email, password, firstName, lastName } = req.body;

      if (!username || !email || !password) {
        res
          .status(400)
          .json({ message: "username, email and password are required" });
        return;
      }

      const userRepository = AppDataSource.getRepository(User);
      const existingUser = await userRepository.findOneBy({ email });

      if (existingUser) {
        res.status(400).json({ message: "Email is already in use" });
        return;
      }

      const hashedPassword = await hashPassword(password);
      const newUser = userRepository.create({
        username,
        email,
        password: hashedPassword,
      });

      newUser.firstName = firstName ?? null;
      newUser.lastName = lastName ?? null;

      await userRepository.save(newUser);
      res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, username, password } = req.body;

      if ((!email && !username) || !password) {
        res.status(400).json({ message: "All fields are required" });
        return;
      }

      const userRepository = AppDataSource.getRepository(User);
      const user = email
        ? await userRepository.findOneBy({ email })
        : await userRepository.findOne({ where: { username: username } });

      if (!user || !(await comparePassword(password, user.password))) {
        res.status(401).json({ message: "Invalid email or password" });
        return;
      }

      const token = generateToken(user.id);
      res
        .cookie("token", token, { httpOnly: true, secure: true })
        .status(200)
        .json({ message: "Login successful" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async getMyDetails(req: Request, res: Response) {
    try {
      if (req.user) {
        const userId = req.user.id;

        const userRepository = AppDataSource.getRepository(User);
        const user = await userRepository.findOne({
          where: { id: userId },
          relations: [
            "position",
            "groups",
            "managingProjects",
            "participatingInProjects",
            "tasksAssigned",
            "subtasksAssigned",
            "tasksVerifying",
          ],
        });

        if (!user) {
          res.status(404).json({ message: "User not found" });
          return;
        }

        res.status(200).json(user.getDetails());
      } else {
        res.status(400).json("Somthing is wrong with yout request");
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

  static async getAllUsers(req: Request, res: Response) {
    try {
      const userRepository = AppDataSource.getRepository(User);
      const users = await userRepository.find({
        where: { isProtected: false },
        relations: [
          "position",
          "groups",
          "managingProjects",
          "participatingInProjects",
          "localPermissions",
          "globalPermissions",
          "localPermissions",
          "projectRoles",
          "tasksAssigned",
          "subtasksAssigned",
          "tasksVerifying",
        ],
      });

      res.status(200).json(users.map((u) => u.getDetails()));
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async getUserDetails(req: Request, res: Response) {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ message: "User id is required" });
      return;
    }

    try {
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: id },
        relations: [
          "position",
          "groups",
          "managingProjects",
          "participatingInProjects",
          "localPermissions",
          "globalPermissions",
          "localPermissions",
          "projectRoles",
          "tasksAssigned",
          "subtasksAssigned",
          "tasksVerifying",
        ],
      });

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      res.status(200).json(user.getDetails());
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async getUserPermissions(req: Request, res: Response) {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ message: "User id is required" });
      return;
    }

    try {
      const permissions = await getUserPermissions(id);

      res.status(200).json(permissions);
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async createUser(req: Request, res: Response) {
    try {
      const { username, email, firstName, lastName } = req.body;

      if (!username || !email) {
        res.status(400).json({ message: "Username and email are required" });
        return;
      }

      const userRepository = AppDataSource.getRepository(User);
      const existingUser = await userRepository.findOneBy({ email });

      if (existingUser) {
        res.status(400).json({ message: "Email is already in use" });
        return;
      }

      const rawPassword = uuidv4().slice(0, 8);
      const hashedPassword = await hashPassword(rawPassword);
      const newUser = userRepository.create({
        username,
        email,
        password: hashedPassword,
      });

      newUser.firstName = firstName ?? null;
      newUser.lastName = lastName ?? null;

      await userRepository.save(newUser);

      await sendEmail({
        to: email,
        subject: "Your New Account",
        text: `Hello ${
          firstName || username
        },\n\nYour account has been created. Your temporary password is: ${rawPassword}\n\nPlease change your password after logging in.`,
      });

      res.status(201).json({ message: "User created successfully" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async requestPasswordReset(req: Request, res: Response) {
    try {
      const { email, username } = req.body;

      if (!email && !username) {
        res.status(400).json({
          message:
            "either email or username is required to reset the passsword",
        });
        return;
      }
      const userRepository = AppDataSource.getRepository(User);
      const user = email
        ? await userRepository.findOne({ where: { email: email } })
        : await userRepository.findOne({ where: { username: username } });

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const resetToken = crypto.randomBytes(32).toString("hex");

      cache.setKey(`resetToken:${resetToken}`, {
        userId: user.id,
        expiresAt: Date.now() + 15 * 60 * 1000,
      });

      const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

      await sendEmail({
        to: email,
        subject: "Password Reset",
        text: `
          <p>You requested a password reset</p>
          <p>Click <a href="${resetURL}">here</a> to reset your password</p>
          <p>This link will expire in 15 minutes.</p>
          <p>If you didn't initiate the password reset, ignore this email.</p>
        `,
        isHtml: true,
      });

      res
        .status(200)
        .json({ message: "Password reset sucessfully requested!" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async resetPassword(req: Request, res: Response) {
    try {
      const { token } = req.params;
      const { newPassword } = req.body;

      if (!token || !newPassword) {
        res.status(400).json({ error: "Token and new password are required" });
        return;
      }

      const cached = cache.getKey(`resetToken:${token}`) as
        | CacheData
        | undefined;

      if (!cached) {
        res.status(400).json({ error: "Invalid or expired token" });
        return;
      }

      const { userId, expiresAt } = cached;

      if (Date.now() < expiresAt) {
        const userRepository = AppDataSource.getRepository(User);
        const user = await userRepository.findOne({ where: { id: userId } });

        if (!user) {
          res.status(404).json({ error: "User not found" });
          return;
        }

        user.password = await hashPassword(newPassword);

        await userRepository.save(user);

        await cache.removeKey(`resetToken:${token}`);
        await cache.save();

        res.status(200).json({ message: "Password successfully reset" });
      } else {
        await cache.removeKey(`resetToken:${token}`);
        await cache.save();
        res.status(410).json({ message: "Link has expired" });
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

  static async deleteUser(req: Request, res: Response) {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ message: "User id is required" });
      return;
    }
    try {
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOneBy({ id: id });

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      await userRepository.remove(user);
      res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async changePassword(req: Request, res: Response) {
    try {
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOneBy({ id: req.user.id });

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      const { oldPassword, newPassword } = req.body;
      if (!(await comparePassword(oldPassword, user.password))) {
        res.status(400).json({ message: "Old password is incorrect" });
        return;
      }

      user.password = await hashPassword(newPassword);
      await userRepository.save(user);
      res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async updateUserGroups(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "User id is required" });
        return;
      }

      const { addGroups, removeGroups } = req.body;

      const userRepository = AppDataSource.getRepository(User);
      const userGroupRepository = AppDataSource.getRepository(UserGroup);
      const user = await userRepository.findOne({
        where: { id: id },
        relations: ["groups"],
      });

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      if (addGroups && Array.isArray(addGroups)) {
        const groupsToAdd = userGroupRepository.find({
          where: { id: In(addGroups) },
        });
        user.groups.push(
          ...(await groupsToAdd).filter(
            (g) => !user.groups.some((ug) => ug.id === g.id)
          )
        );
      }

      if (removeGroups && Array.isArray(removeGroups)) {
        user.groups = user.groups.filter((g) => !removeGroups.includes(g.id));
      }

      await userRepository.save(user);
      res.status(200).json({ message: "User groups updated successfully" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async updateUserProjectRoles(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "User id is required" });
        return;
      }

      const { addProjectRoles, removeProjectRoles } = req.body;

      const userRepository = AppDataSource.getRepository(User);
      const projectRoleRepository = AppDataSource.getRepository(ProjectRole);
      const user = await userRepository.findOne({
        where: { id: id },
        relations: [
          "projectRoles",
          "participatingInProjects",
          "managingProjects",
        ],
      });

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      if (addProjectRoles && Array.isArray(addProjectRoles)) {
        const projectRolesToAdd = await projectRoleRepository.find({
          where: { id: In(addProjectRoles) },
          relations: ["project"],
        });

        user.projectRoles.push(
          ...projectRolesToAdd.filter(
            (r) => !user.projectRoles.some((ur) => ur.id === r.id)
          )
        );

        if (
          projectRolesToAdd
            .filter((r) => r.isManagingTeam)
            .some((r) =>
              user.participatingInProjects.some((p) => p.id === r.project.id)
            )
        ) {
          res.status(400).json({
            message:
              "User cannot be assigned a managing role for the project as they are already participating.",
          });
          return;
        }

        if (
          projectRolesToAdd
            .filter((r) => !r.isManagingTeam)
            .some((r) =>
              user.managingProjects?.some((p) => p.id === r.project.id)
            )
        ) {
          res.status(400).json({
            message:
              "User cannot be assigned a participating role for the project as they are already managing.",
          });
          return;
        }

        user.participatingInProjects.push(
          ...projectRolesToAdd
            .filter((r) => !r.isManagingTeam)
            .map((r) => r.project)
            .filter(
              (r) => !user.participatingInProjects?.some((p) => p.id === r.id)
            )
        );

        user.managingProjects.push(
          ...projectRolesToAdd
            .filter((r) => r.isManagingTeam)
            .map((r) => r.project)
            .filter((r) => !user.managingProjects?.some((p) => p.id === r.id))
        );
      }

      if (removeProjectRoles && Array.isArray(removeProjectRoles)) {
        user.projectRoles = user.projectRoles.filter(
          (r) => !removeProjectRoles.includes(r.id)
        );
      }

      await userRepository.save(user);
      res
        .status(200)
        .json({ message: "User project roles updated successfully" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "User id is required" });
        return;
      }

      const { username, firstName, lastName, email, positionId, isArchided } =
        req.body;

      const userRepository = AppDataSource.getRepository(User);
      const positionRepository = AppDataSource.getRepository(Position);
      const user = await userRepository.findOne({
        where: { id: id },
        relations: ["position"],
      });

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      if (username) {
        user.username = username;
      }

      if (email) {
        user.email = email;
      }

      if (firstName !== undefined) {
        user.firstName = firstName;
      }

      if (lastName !== undefined) {
        user.lastName = lastName;
      }

      if (positionId !== undefined) {
        const position = positionId
          ? await positionRepository.findOneBy({ id: positionId })
          : null;
        user.position = position;
      }

      if (isArchided !== undefined) {
        user.isArchived = !!isArchided;
      }

      await userRepository.save(user);
      res.status(200).json({ message: "User updated successfully" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async updateUserPermissions(req: Request, res: Response) {
    const {
      addGlobalPermissions,
      removeGlobalPermissions, //expected an array of objects of the following structure: [{ subject: GlobalPermissionSubject, canRead?: boolean | null, canEdit?: boolean | null, canDelete?: boolean | null, canCreate?: boolean | null}, {...}, ...]
      addLocalPermissions,
      removeLocalPermissions, //expected an array of objects of the following structure: [{ resourceId: Resource.id, canRead?: boolean | null, canEdit?: boolean | null, canDelete?: boolean | null, canCreate?: boolean | null}, {...}, ...]
    } = req.body;

    try {
      await UserController.updateUser(req, res);

      if (addGlobalPermissions || removeGlobalPermissions) {
        await GlobalPermissionController.updateUserGlobalPermissions(req, res);
      }
      if (addLocalPermissions || removeLocalPermissions) {
        await LocalPermissionController.updateUserLocalPermissions(req, res);
      }

      if (!res.headersSent) {
        res
          .status(200)
          .json({ message: "User permissions updated successfully" });
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

  static async removeUsersFromProjectTasks(
    userIds: string[],
    projectId: number
  ) {
    const tasksRepository = AppDataSource.getRepository(Task);
    const subtaskRepository = AppDataSource.getRepository(Subtask);

    const tasks = await tasksRepository.find({
      where: { project: { id: projectId } },
      relations: ["assignee", "verifier", "project"],
    });

    const subtasks = await subtaskRepository.find({
      where: {
        task: { project: { id: projectId } },
        assignee: { id: In(userIds) },
      },
      relations: ["assignee"],
    });

    tasks.map((task) => {
      if (task.assignee && userIds.includes(task.assignee?.id)) {
        task.assignee = null;
      }

      if (task.verifier && userIds.includes(task.verifier?.id)) {
        task.verifier = null;
      }

      return task;
    });

    subtasks.map((t) => {
      t.assignee = null;
      return t;
    });

    await tasksRepository.save(tasks);
    await subtaskRepository.save(subtasks);
  }

  static async removeUsersFromProjectRoles(
    userIds: string[],
    projectId: number
  ) {
    const projectRoleRepository = AppDataSource.getRepository(ProjectRole);
    const roles = await projectRoleRepository.find({
      where: { project: { id: projectId } },
      relations: ["assignedUsers"],
    });

    roles.map((role) => {
      role.assignedUsers = role.assignedUsers.filter(
        (au) => !userIds.includes(au.id)
      );
      return role;
    });
    projectRoleRepository.save(roles);
  }
}
