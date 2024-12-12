import express from "express";
import { authenticate } from "../middleware/authMiddleware";
import { ResourceController } from "../controller/ResourceController";

const router = express.Router();

router.get(
  "/resource",
  authenticate,
  ResourceController.getAllResources
);

router.get(
  "/resource/:id",
  authenticate,
  ResourceController.getResource
);

export default router;
