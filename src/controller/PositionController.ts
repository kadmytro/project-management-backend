import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Position } from "../entity/Position";
import { In } from "typeorm";
import { User } from "../entity/User";
import { LocalPermissionController } from "./LocalPermissionController";
import { GlobalPermissionController } from "./GlobalPermissionsController";
import { getErrorDetails } from "../utils/errorFormatter";
import { getPositionPermissions } from "../service/permissionService";

export class PositionController {
  static async getAllPositions(req: Request, res: Response) {
    try {
      const positionRepository = AppDataSource.getRepository(Position);
      const positions = await positionRepository.find({
        relations: ["users"],
      });
      res.status(200).json(positions?.map((p) => p.getDetails()));
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async getPositionById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Position id is required" });
        return;
      }

      const positionRepository = AppDataSource.getRepository(Position);
      const position = await positionRepository.findOne({
        where: { id: id },
        relations: ["users"],
      });

      if (!position) {
        res.status(404).json({ message: "Position not found" });
        return;
      }

      res.status(200).json(position.getDetails());
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async getPositionUsers(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Position id is required" });
        return;
      }

      const positionRepository = AppDataSource.getRepository(Position);
      const position = await positionRepository.findOne({
        where: { id },
        relations: ["users"],
      });

      if (!position) {
        res.status(404).json({ message: "Position not found" });
        return;
      }

      res.status(200).json(position.users?.map((p) => p.getDetails()));
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async getPositionPermissions(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Position id is required" });
        return;
      }

      const positionPermissions = await getPositionPermissions(id);

      res.status(200).json(positionPermissions);
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async createPosition(req: Request, res: Response) {
    try {
      const { name, description } = req.body;

      if (!name) {
        res.status(400).json({ message: "Position name is required" });
        return;
      }

      const positionRepository = AppDataSource.getRepository(Position);
      const existingPosition = await positionRepository.findOneBy({ name });

      if (existingPosition) {
        res
          .status(400)
          .json({ message: "Position with the same name already exists" });
        return;
      }

      const newPosition = positionRepository.create({
        name,
        description,
      });

      await positionRepository.save(newPosition);

      res.status(201).json({ message: "Position created successfully" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async updatePositionUsers(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Position id is required" });
        return;
      }

      const { addUsers, removeUsers } = req.body;

      const positionRepository = AppDataSource.getRepository(Position);
      const userRepository = AppDataSource.getRepository(User);

      const position = await positionRepository.findOne({
        where: { id },
        relations: ["users"],
      });

      if (!position) {
        res.status(404).json({ message: "Position not found" });
        return;
      }

      if (position.isProtected) {
        res
          .status(403)
          .json({ message: "position is protected and cannot be modified" });
        return;
      }

      if (addUsers && Array.isArray(addUsers)) {
        const usersToAdd = await userRepository.find({
          where: { id: In(addUsers) },
        });

        position.users.push(
          ...usersToAdd.filter((user) => !position.users.includes(user))
        );
      }

      if (removeUsers && Array.isArray(removeUsers)) {
        position.users = position.users.filter(
          (user) => !removeUsers.includes(user.id)
        );
      }
      await positionRepository.save(position);

      if (!res.headersSent) {
        res
          .status(200)
          .json({ message: "Position users updated successfully" });
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

  static async updatePositionPermissions(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Position id is required" });
        return;
      }

      const {
        addLocalPermissions,
        removeLocalPermissions,
        addGlobalPermissions,
        removeGlobalPermissions,
      } = req.body;

      const positionRepository = AppDataSource.getRepository(Position);

      const position = await positionRepository.findOne({
        where: { id },
      });

      if (!position) {
        res.status(404).json({ message: "Position not found" });
        return;
      }

      if (position.isProtected) {
        res
          .status(403)
          .json({ message: "position is protected and cannot be modified" });
        return;
      }

      if (addLocalPermissions || removeLocalPermissions) {
        await LocalPermissionController.updatePositionLocalPermissions(
          req,
          res
        );
      }

      if (addGlobalPermissions || removeGlobalPermissions) {
        await GlobalPermissionController.updatePositionGlobalPermissions(
          req,
          res
        );
      }

      if (!res.headersSent) {
        res
          .status(200)
          .json({ message: "Position permissions updated successfully" });
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

  static async updatePosition(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Position id is required" });
        return;
      }

      const { name, description, isArchided } = req.body;

      const positionRepository = AppDataSource.getRepository(Position);
      const position = await positionRepository.findOne({
        where: { id },
      });

      if (!position) {
        res.status(404).json({ message: "Position not found" });
        return;
      }

      if (position.isProtected) {
        res
          .status(403)
          .json({ message: "position is protected and cannot be modified" });
        return;
      }

      if (name) position.name = name;
      if (description !== undefined) {
        position.description = description;
      }

      if (isArchided !== undefined) {
        position.isArchived = !!isArchided;
      }

      await positionRepository.save(position);

      if (!res.headersSent) {
        res.status(200).json({ message: "Position updated successfully" });
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

  static async deletePosition(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Position id is required" });
        return;
      }

      const positionRepository = AppDataSource.getRepository(Position);
      const position = await positionRepository.findOneBy({ id });

      if (!position) {
        res.status(404).json({ message: "Position not found" });
        return;
      }

      if (position.isProtected) {
        res
          .status(403)
          .json({ message: "position is protected and cannot be deleted" });
        return;
      }
      await positionRepository.remove(position);

      res.status(200).json({ message: "Position deleted successfully" });
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
