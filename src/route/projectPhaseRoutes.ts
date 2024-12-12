import express from "express";
import { ProjectPhaseController } from "../controller/ProjectPhaseController";
import { authenticate } from "../middleware/authMiddleware";
import { authorizeLocal } from "../middleware/permissionMiddleware";
import { PermissionType } from "../type/PermissionType";
import { ResourceType } from "../type/ResourceType";
import { TaskController } from "../controller/TaskController";

const router = express.Router();

// Get phase by ID
router.get(
  "/projectPhase/:id",
  authenticate,
  authorizeLocal(PermissionType.READ, ResourceType.PROJECT_PHASE, "id"),
  ProjectPhaseController.getProjectPhaseById
);

// Get phase tasks
router.get(
  "/projectPhase/:id/tasks",
  authenticate,
  authorizeLocal(PermissionType.READ, ResourceType.PROJECT_PHASE, "id"),
  ProjectPhaseController.getProjectPhaseTasks
);

// Create a task within the phase
router.post(
  "/projectPhase/:projectPhaseId/task",
  authenticate,
  authorizeLocal(
    PermissionType.EDIT,
    ResourceType.PROJECT_PHASE,
    "projectPhaseId"
  ),
  TaskController.createTask
);

// Edit a phase
router.patch(
  "/projectPhase/:id",
  authenticate,
  authorizeLocal(PermissionType.EDIT, ResourceType.PROJECT_PHASE, "id"),
  ProjectPhaseController.updateProjectPhase
);

// Reorder tasks within a phase
router.patch(
  "/projectPhase/:projectPhaseId/reorderTasks",
  authenticate,
  authorizeLocal(
    PermissionType.EDIT,
    ResourceType.PROJECT_PHASE,
    "projectPhaseId"
  ),
  TaskController.reorderTasks
);

// Delete a phase
router.delete(
  "/projectPhase/:id",
  authenticate,
  authorizeLocal(PermissionType.DELETE, ResourceType.PROJECT_PHASE, "id"),
  ProjectPhaseController.deleteProjectPhase
);

export default router;
