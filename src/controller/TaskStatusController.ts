import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { TaskStatus } from "../entity/TaskStatus";
import { Task } from "../entity/Task";
import { In, Raw } from "typeorm";
import { Subtask } from "../entity/Subtask";
import { getErrorDetails } from "../utils/errorFormatter";

export class TaskStatusController {
  static async getAllTaskStatuses(req: Request, res: Response) {
    try {
      const taskStatusRepository = AppDataSource.getRepository(TaskStatus);
      const tasks = await taskStatusRepository.find({
        relations: ["tasks", "subtasks"],
      });
      res.status(200).json(tasks);
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async getTaskStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Task status id is required" });
        return;
      }

      const taskStatusRepository = AppDataSource.getRepository(TaskStatus);
      const task = await taskStatusRepository.findOne({
        where: { id: parseInt(id) },
        relations: ["tasks", "subtasks"],
      });

      if (!task) {
        res.status(404).json({ message: "Task not found" });
        return;
      }

      res.status(200).json(task);
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async createTaskStatus(req: Request, res: Response) {
    try {
      const { name, color } = req.body;
      const taskStatusRepository = AppDataSource.getRepository(TaskStatus);
      const subtaskRepository = AppDataSource.getRepository(Subtask);
      const taskRepository = AppDataSource.getRepository(Task);
      if (!name || !color) {
        res.status(400).json({ message: "Name and color are mandatory" });
        return;
      }

      if (!TaskStatusController.isValidHexColor(color)) {
        res.status(400).json({ message: "This is not a valid hex color" });
        return;
      }

      const existingTaskStatus = await taskStatusRepository.findOne({
        where: {
          name: Raw((alias) => `LOWER(${alias}) = LOWER(:name)`, { name }),
        },
      });

      if (existingTaskStatus) {
        res
          .status(400)
          .json({ message: "Task status with this name already exists" });
        return;
      }

      const newTaskStatus = taskStatusRepository.create({
        name,
        color,
      });

      await taskStatusRepository.save(newTaskStatus);
      res.status(201).json({ message: "Task status created successfully" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async updateTaskStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Task status id is required" });
        return;
      }

      const { name, color } = req.body;
      const taskStatusRepository = AppDataSource.getRepository(TaskStatus);
      const taskStatus = await taskStatusRepository.findOne({
        where: { id: parseInt(id) },
      });

      if (!taskStatus) {
        res.status(404).json({ message: "Task status not found" });
        return;
      }

      if (taskStatus.isProtected) {
        res.status(403).json({
          message: "this task status is protected, you cannot update it",
        });
        return;
      }

      const existingTaskStatus = await taskStatusRepository.findOne({
        where: {
          name: Raw((alias) => `LOWER(${alias}) = LOWER(:name)`, { name }),
        },
      });

      if (existingTaskStatus) {
        res
          .status(400)
          .json({ message: "Task status with this name already exists" });
        return;
      }

      if (name) {
        taskStatus.name = name;
      }

      if (color) {
        if (!TaskStatusController.isValidHexColor(color)) {
          res.status(400).json({ message: "This is not a valid hex color" });
          return;
        }
        taskStatus.color = color;
      }

      await taskStatusRepository.save(taskStatus);
      res.status(201).json({ message: "Task status updated successfully" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async deleteTaskStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Task status id is required" });
        return;
      }

      const taskStatusRepository = AppDataSource.getRepository(TaskStatus);
      const taskStatus = await taskStatusRepository.findOne({
        where: { id: parseInt(id) },
      });

      if (!taskStatus) {
        res.status(404).json({ message: "Task status not found" });
        return;
      }

      if (taskStatus.isProtected) {
        res.status(403).json({
          message: "this task status is protected, you cannot update it",
        });
        return;
      }

      await taskStatusRepository.remove(taskStatus);

      res.status(200).json({ message: "Task status deleted successfully" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static isValidHexColor(hex: string) {
    const regex = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
    return regex.test(hex);
  }
}
