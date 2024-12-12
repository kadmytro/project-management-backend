import express from "express";
import { TaskController } from "../controller/TaskController";
import { authenticate } from "../middleware/authMiddleware";
import {
  authorizeGlobal,
  authorizeLocal,
  authorizeSubmission,
  authorizeTaskRead,
} from "../middleware/permissionMiddleware";
import { PermissionType } from "../type/PermissionType";
import { ResourceType } from "../type/ResourceType";
import { GlobalPermissionSubject } from "../type/GlobalPermissionSubject";
import { SubtaskController } from "../controller/SubtaskController";
import { RecurrenceFrequencyController } from "../controller/RecurrenceFrequencyController";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

// Get all tasks
router.get(
  "/task",
  authenticate,
  authorizeGlobal(PermissionType.READ, GlobalPermissionSubject.PROJECTS),
  TaskController.getAllTasks
);

// get task by id
router.get(
  "/task/:id",
  authenticate,
  authorizeTaskRead(ResourceType.TASK, "id"),
  TaskController.getTask
);

// get subtasks of a task
router.get(
  "/task/:id/subtasks",
  authenticate,
  authorizeTaskRead(ResourceType.TASK, "id"),
  TaskController.getSubtasks
);

// create subtask in a task
router.post(
  "/task/:taskId/subtask/",
  authenticate,
  authorizeLocal(PermissionType.EDIT, ResourceType.TASK, "taskId"),
  SubtaskController.createSubtask
);

// edit a task
router.patch(
  "/task/:id",
  authenticate,
  authorizeLocal(PermissionType.EDIT, ResourceType.TASK, "id"),
  TaskController.updateTask
);

// submit a task
router.post(
  "/task/:id/submit",
  authenticate,
  authorizeSubmission(ResourceType.TASK, "id"),
  upload.single("file"),
  TaskController.submitTask
);

// verify a task
router.post(
  "/task/:id/verify",
  authenticate,
  authorizeSubmission(ResourceType.TASK, "id", true),
  upload.single("file"),
  TaskController.verifyTask
);

// Reorder subtasks within a task
router.patch(
  "/task/:taskId/reorderSubtasks",
  authenticate,
  authorizeLocal(PermissionType.EDIT, ResourceType.TASK, "taskId"),
  SubtaskController.reorderSubtasks
);

//delete a task
router.delete(
  "/task/:id",
  authenticate,
  authorizeLocal(PermissionType.DELETE, ResourceType.TASK, "id"),
  TaskController.deleteTask
);

export default router;
