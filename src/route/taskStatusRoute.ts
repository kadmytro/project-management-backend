import express from "express";
import { authenticate } from "../middleware/authMiddleware";
import { authorizeGlobal } from "../middleware/permissionMiddleware";
import { PermissionType } from "../type/PermissionType";
import { GlobalPermissionSubject } from "../type/GlobalPermissionSubject";
import { TaskStatusController } from "../controller/TaskStatusController";
import { TaskController } from "../controller/TaskController";

const router = express.Router();

router.get(
  "/taskStatus",
  authenticate,
  TaskStatusController.getAllTaskStatuses
);

router.get("/taskStatus/:id", authenticate, TaskStatusController.getTaskStatus);

router.get(
  "/taskStatus/:taskStatusId/tasks",
  authenticate,
  authorizeGlobal(PermissionType.READ, GlobalPermissionSubject.PROJECTS),
  TaskController.getTasksWithTaskStatus
);

router.post(
  "/taskStatus",
  authenticate,
  authorizeGlobal(PermissionType.EDIT, GlobalPermissionSubject.PROJECTS),
  TaskStatusController.createTaskStatus
);

router.patch(
  "/taskStatus/:id",
  authenticate,
  authorizeGlobal(PermissionType.EDIT, GlobalPermissionSubject.PROJECTS),
  TaskStatusController.updateTaskStatus
);

router.delete(
  "/taskStatus/:id",
  authenticate,
  authorizeGlobal(PermissionType.EDIT, GlobalPermissionSubject.PROJECTS),
  TaskStatusController.deleteTaskStatus
);

export default router;
