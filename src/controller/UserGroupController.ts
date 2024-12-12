import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { UserGroup } from "../entity/UserGroup";
import { User } from "../entity/User";
import { In } from "typeorm";
import { getErrorDetails } from "../utils/errorFormatter";

export class UserGroupController {
  static async getAllGroups(req: Request, res: Response) {
    try {
      const groupRepository = AppDataSource.getRepository(UserGroup);

      const groups = await groupRepository.find({ relations: ["users"] });

      res.status(200).json(groups.map((g) => g.getDetails()));
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async getGroup(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Usergroup id is required" });
        return;
      }

      const groupRepository = AppDataSource.getRepository(UserGroup);

      const group = await groupRepository.findOne({
        where: { id: Number(id) },
        relations: ["users"],
      });

      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      res.status(200).json(group.getDetails());
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async getGroupUsers(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Usergroup id is required" });
        return;
      }

      const groupRepository = AppDataSource.getRepository(UserGroup);

      const group = await groupRepository.findOne({
        where: { id: Number(id) },
        relations: [
          "users",
          "users.position",
          "users.groups",
          "users.managingProjects",
          "users.participatingInProjects",
          "users.projectRoles",
          "users.tasksAssigned",
          "users.tasksVerifying",
        ],
      });

      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      res.status(200).json(group.users.map((u) => u.getDetails()));
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async createGroup(req: Request, res: Response) {
    try {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Group name is required" });
      }

      const groupRepository = AppDataSource.getRepository(UserGroup);
      const existingGroup = await groupRepository.findOneBy({ name });

      if (existingGroup) {
        return res
          .status(400)
          .json({ message: "Group with the same name already exists" });
      }

      const newGroup = groupRepository.create({
        name,
        description,
      });

      await groupRepository.save(newGroup);

      res.status(201).json({ message: "Group created successfully" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async deleteGroup(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Usergroup id is required" });
        return;
      }

      const groupRepository = AppDataSource.getRepository(UserGroup);

      const group = await groupRepository.findOneBy({ id: Number(id) });

      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      await groupRepository.remove(group);

      res.status(200).json({ message: "Group deleted successfully" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async updateUserGroupUsers(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Usergroup id is required" });
        return;
      }

      const { addUsers, removeUsers } = req.body;

      const groupRepository = AppDataSource.getRepository(UserGroup);
      const userRepository = AppDataSource.getRepository(User);

      const group = await groupRepository.findOne({
        where: { id: Number(id) },
        relations: ["users"],
      });

      if (!group) {
        res.status(404).json({ message: "Group not found" });
        return;
      }

      if (addUsers && Array.isArray(addUsers)) {
        const usersToAdd = await userRepository.find({
          where: { id: In(addUsers) },
        });

        group.users.push(
          ...usersToAdd.filter((user) => !group.users.includes(user))
        );
      }

      if (removeUsers && Array.isArray(removeUsers)) {
        group.users = group.users.filter(
          (user) => !removeUsers.includes(user.id)
        );
      }

      await groupRepository.save(group);

      res.status(200).json({ message: "Group users updated successfully" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async updateGroup(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Usergroup id is required" });
        return;
      }

      const { name, description } = req.body;

      const groupRepository = AppDataSource.getRepository(UserGroup);

      const group = await groupRepository.findOne({
        where: { id: Number(id) },
        relations: ["users"],
      });

      if (!group) {
        res.status(404).json({ message: "Group not found" });
        return;
      }

      if (name) group.name = name;
      if (description) group.description = description;

      await groupRepository.save(group);

      res.status(200).json({ message: "Group updated successfully" });
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
