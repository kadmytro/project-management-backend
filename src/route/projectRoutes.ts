import express from "express";
import { ProjectController } from "../controller/ProjectController";
import { authenticate } from "../middleware/authMiddleware";
import {
  authorizeGlobal,
  authorizeLocal,
} from "../middleware/permissionMiddleware";
import { PermissionType } from "../type/PermissionType";
import { GlobalPermissionSubject } from "../type/GlobalPermissionSubject";
import { ResourceType } from "../type/ResourceType";
import { ProjectRoleController } from "../controller/ProjectRoleController";
import { TaskController } from "../controller/TaskController";
import { ProjectPhaseController } from "../controller/ProjectPhaseController";

const router = express.Router();

// Get all projects
router.get(
  "/project",
  authenticate,
  authorizeGlobal(PermissionType.READ, GlobalPermissionSubject.PROJECTS),
  ProjectController.getAllProjects
);

// Get project by ID
router.get(
  "/project/:id",
  authenticate,
  authorizeLocal(PermissionType.READ, ResourceType.PROJECT, "id"),
  ProjectController.getProjectById
);

//Get project roles
router.get(
  "/project/:id/projectRoles",
  authenticate,
  authorizeLocal(PermissionType.READ, ResourceType.PROJECT, "id"),
  ProjectController.getProjectRoles
);

// Get all phases of a project
router.get(
  "/project/:id/projectPhases",
  authenticate,
  authorizeLocal(PermissionType.READ, ResourceType.PROJECT, "id"),
  ProjectController.getProjectPhases
);

// Create a project
router.post(
  "/project",
  authenticate,
  authorizeGlobal(PermissionType.CREATE, GlobalPermissionSubject.PROJECTS),
  ProjectController.createProject
);

// Create a project role
router.post(
  "/project/:projectId/projectRole",
  authenticate,
  authorizeLocal(PermissionType.EDIT, ResourceType.PROJECT, "projectId"),
  ProjectRoleController.createProjectRole
);

// Create a phase in a project
router.post(
  "/project/:projectId/projectPhase",
  authenticate,
  authorizeLocal(PermissionType.EDIT, ResourceType.PROJECT, "projectId"),
  ProjectPhaseController.createProjectPhase
);

// Create a task in a project
router.post(
  "/project/:projectId/task",
  authenticate,
  authorizeLocal(PermissionType.EDIT, ResourceType.PROJECT, "projectId"),
  TaskController.createTask
);

// Edit a project
router.patch(
  "/project/:id",
  authenticate,
  authorizeLocal(PermissionType.EDIT, ResourceType.PROJECT, "id"),
  ProjectController.updateProject
);

// Edit a project users
router.patch(
  "/project/:id/users",
  authenticate,
  authorizeLocal(PermissionType.EDIT, ResourceType.PROJECT, "id"),
  ProjectController.updateProjectUsers
);

// Reorder tasks within a project
router.patch(
  "/project/:projectId/reorderTasks",
  authenticate,
  authorizeLocal(PermissionType.EDIT, ResourceType.PROJECT, "projectId"),
  TaskController.reorderTasks
);

// Reorder phases within a project
router.patch(
  "/project/:projectId/reorderPhases",
  authenticate,
  authorizeLocal(PermissionType.EDIT, ResourceType.PROJECT, "projectId"),
  ProjectPhaseController.reorderPhases
);

// Delete a project
router.delete(
  "/project/:id",
  authenticate,
  authorizeLocal(PermissionType.DELETE, ResourceType.PROJECT, "id"),
  ProjectController.deleteProject
);

export default router;
