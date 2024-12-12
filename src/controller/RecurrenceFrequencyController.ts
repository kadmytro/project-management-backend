import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { RecurrenceFrequency } from "../entity/RecurrenceFrequency";
import { getErrorDetails } from "../utils/errorFormatter";
import { Task } from "../entity/Task";
import {
  isValidRecurrenceType,
  isValidRecurrenceUnit,
  RecurrenceType,
  RecurrenceUnit,
} from "../type/RecurrenceUnits";

export class RecurrenceFrequencyController {
  static async getAllFrequencies(req: Request, res: Response) {
    try {
      const recurrenceFrequencyRepository =
        AppDataSource.getRepository(RecurrenceFrequency);
      const frequencies = await recurrenceFrequencyRepository.find({
        relations: ["task"],
      });

      res.status(200).json(frequencies);
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async getFrequency(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Frequency id is required" });
        return;
      }

      const recurrenceFrequencyRepository =
        AppDataSource.getRepository(RecurrenceFrequency);
      const frequency = await recurrenceFrequencyRepository.find({
        where: { id: parseInt(id) },
        relations: ["task"],
      });

      if (!frequency) {
        res.status(404).json({ message: "Frequency not found" });
        return;
      }
      res.status(200).json(frequency);
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static createRecurrenceFrequencyEntity(params: {
    type: RecurrenceType;
    intervalValue?: number;
    intervalUnit?: RecurrenceUnit;
    daysOfWeek?: number[];
    dayOfMonth?: number;
  }): RecurrenceFrequency {
    const { type, intervalValue, intervalUnit, daysOfWeek, dayOfMonth } =
      params;

    const frequencyRepository =
      AppDataSource.getRepository(RecurrenceFrequency);

    const newFrequency = frequencyRepository.create({ type });

    if (type === RecurrenceType.INTERVAL && intervalValue && intervalUnit) {
      newFrequency.intervalValue = intervalValue;
      newFrequency.intervalUnit = intervalUnit;
    } else if (type === RecurrenceType.WEEKLY && daysOfWeek) {
      newFrequency.daysOfWeek = daysOfWeek;
    } else if (type === RecurrenceType.MONTHLY && dayOfMonth) {
      newFrequency.dayOfMonth = dayOfMonth;
    } else {
      throw new Error("Invalid frequency parameters");
    }

    return newFrequency;
  }
}
