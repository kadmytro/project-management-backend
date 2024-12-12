import express from "express";
import { authenticate } from "../middleware/authMiddleware";
import { RecurrenceFrequencyController } from "../controller/RecurrenceFrequencyController";

const router = express.Router();

router.get(
  "frequency/:id",
  authenticate,
  RecurrenceFrequencyController.getFrequency
);

export default router;
