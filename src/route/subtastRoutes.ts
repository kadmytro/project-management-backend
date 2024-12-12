import express from "express";
import { authenticate } from "../middleware/authMiddleware";
import {
  authorizeGlobal,
  authorizeLocal,
  authorizeSubmission,
} from "../middleware/permissionMiddleware";
import { PermissionType } from "../type/PermissionType";
import { ResourceType } from "../type/ResourceType";
import { GlobalPermissionSubject } from "../type/GlobalPermissionSubject";
import { SubtaskController } from "../controller/SubtaskController";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

router.get(
  "/subtask/",
  authenticate,
  authorizeGlobal(PermissionType.READ, GlobalPermissionSubject.PROJECTS),
  SubtaskController.getAllSubtasks
);

router.get(
  "/subtask/:id",
  authenticate,
  authorizeLocal(PermissionType.READ, ResourceType.SUBTASK, "id"),
  SubtaskController.getSubtask
);

router.patch(
  "/subtask/:id",
  authenticate,
  authorizeLocal(PermissionType.EDIT, ResourceType.SUBTASK, "id"),
  SubtaskController.updateSubtask
);

router.post(
  "/subtask/:id/submit",
  authenticate,
  authorizeSubmission(ResourceType.SUBTASK, "id"),
  upload.single("file"),
  SubtaskController.submitSubtask
);

router.delete(
  "/subtask/:id",
  authenticate,
  authorizeLocal(PermissionType.DELETE, ResourceType.SUBTASK, "id"),
  SubtaskController.deleteSubtask
);

export default router;
