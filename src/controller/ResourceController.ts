import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Resource } from "../entity/Resource";
import { ResourceType } from "../type/ResourceType";
import { getErrorDetails } from "../utils/errorFormatter";

export class ResourceController {
  static async getAllResources(req: Request, res: Response) {
    try {
      const resourceRepository = AppDataSource.getRepository(Resource);
      const resources = await resourceRepository.find({
        relations: ["parent", "children"],
      });
      res.status(200).json(resources);
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async getResource(req: Request, res: Response) {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ message: "Resource id is required" });
      return;
    }

    try {
      const resourceRepository = AppDataSource.getRepository(Resource);
      const resource = await resourceRepository.findOne({
        where: { id: parseInt(id) },
        relations: ["parent", "children"],
      });

      if (!resource) {
        res.status(404).json({ message: "Resource not found" });
        return;
      }

      res.status(200).json(resource);
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async createResource(req: Request, res: Response) {
    try {
      const { type, entityId, parentId } = req.body;

      const resourceRepository = AppDataSource.getRepository(Resource);

      if (!type || !entityId) {
        res.status(400).json({ message: "Type and entityId are mandatory" });
        return;
      }

      if (!Object.values(ResourceType).includes(type)) {
        res.status(400).json({ message: "Invalid resource type" });
        return;
      }

      const parent = parentId
        ? await resourceRepository.findOneBy({ id: parentId })
        : null;

      const newResource = resourceRepository.create({
        type,
        entityId,
        parent,
      });

      await resourceRepository.save(newResource);
      res.status(201).json({ message: "Resource created successfully" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async updateResource(req: Request, res: Response) {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ message: "Resource id is required" });
      return;
    }

    const { type, entityId, parentId } = req.body;

    try {
      const resourceRepository = AppDataSource.getRepository(Resource);

      const resource = await resourceRepository.findOne({
        where: { id: parseInt(id) },
        relations: ["parent"],
      });

      if (!resource) {
        res.status(404).json({ message: "Resource not found" });
        return;
      }

      if (type !== undefined) {
        if (!Object.values(ResourceType).includes(type)) {
          res.status(400).json({ message: "Invalid resource type" });
          return;
        }
        resource.type = type;
      }

      if (entityId !== undefined) resource.entityId = entityId;

      if (parentId !== undefined) {
        const parent = parentId
          ? await resourceRepository.findOneBy({ id: parentId })
          : null;
        resource.parent = parent;
      }

      await resourceRepository.save(resource);

      res.status(200).json({ message: "Resource updated successfully" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async deleteResource(req: Request, res: Response) {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ message: "Resource id is required" });
      return;
    }

    try {
      const resourceRepository = AppDataSource.getRepository(Resource);
      const resource = await resourceRepository.findOneBy({ id: parseInt(id) });

      if (!resource) {
        res.status(404).json({ message: "Resource not found" });
        return;
      }

      await resourceRepository.remove(resource);

      res.status(200).json({ message: "Resource deleted successfully" });
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
