import express, { NextFunction } from "express";
import { authenticate } from "../middleware/authMiddleware";
import {
  authorizeGlobal,
  authorizeLocal,
} from "../middleware/permissionMiddleware";
import { PermissionType } from "../type/PermissionType";
import { GlobalPermissionSubject } from "../type/GlobalPermissionSubject";
import { ResourceType } from "../type/ResourceType";
import { TemplateController } from "../controller/TemplateController";

const router = express.Router();

// Get all project templates
router.get(
  "/template/project",
  authenticate,
  authorizeGlobal(PermissionType.READ, GlobalPermissionSubject.TEMPLATES),
  TemplateController.getAllProjectTemplates
);

// Get project template by ID
router.get(
  "/template/project/:id",
  authenticate,
  authorizeLocal(PermissionType.READ, ResourceType.TEMPLATE, "id"),
  TemplateController.getProjectTemplateById
);

// Create a project template
router.post(
  "/template/project",
  authenticate,
  authorizeGlobal(PermissionType.CREATE, GlobalPermissionSubject.TEMPLATES),
  TemplateController.createProjectTemplate
);

// Edit a project template
router.patch(
  "/template/project/:id",
  authenticate,
  authorizeLocal(PermissionType.EDIT, ResourceType.TEMPLATE, "id"),
  TemplateController.updateProjectTemplate
);

// Delete a project template
router.delete(
  "/template/project/:id",
  authenticate,
  authorizeLocal(PermissionType.DELETE, ResourceType.TEMPLATE, "id"),
  TemplateController.deleteProjectTemplate
);

// Get all project template phases
router.get(
  "/template/project/:projectTemplateId/projectPhases",
  authenticate,
  authorizeLocal(
    PermissionType.READ,
    ResourceType.TEMPLATE,
    "projectTemplateId"
  ),
  TemplateController.getProjectTemplatePhases
);

// Get template phase by id
router.get(
  "/template/project/:projectTemplateId/projectPhase/:id",
  authenticate,
  authorizeLocal(
    PermissionType.READ,
    ResourceType.TEMPLATE,
    "projectTemplateId"
  ),
  TemplateController.getTemplatePhase
);

// Create new project template phase
router.post(
  "/template/project/:projectTemplateId/projectPhase",
  authenticate,
  authorizeLocal(
    PermissionType.EDIT,
    ResourceType.TEMPLATE,
    "projectTemplateId"
  ),
  TemplateController.createTemplatePhase
);

// Reorder project template phases
router.patch(
  "/template/project/:projectTemplateId/reorderPhases",
  authenticate,
  authorizeLocal(
    PermissionType.EDIT,
    ResourceType.TEMPLATE,
    "projectTemplateId"
  ),
  TemplateController.reorderTemplatePhases
);

// Update existing template phase by id
router.patch(
  "/template/project/:projectTemplateId/projectPhase/:id",
  authenticate,
  authorizeLocal(
    PermissionType.EDIT,
    ResourceType.TEMPLATE,
    "projectTemplateId"
  ),
  TemplateController.updateTemplatePhase
);

// Delete existing template phase by id
router.delete(
  "/template/project/:projectTemplateId/projectPhase/:id",
  authenticate,
  authorizeLocal(
    PermissionType.EDIT,
    ResourceType.TEMPLATE,
    "projectTemplateId"
  ),
  TemplateController.deleteTemplatePhase
);

// Get template task by id
router.get(
  "/template/project/:projectTemplateId/task/:id",
  authenticate,
  authorizeLocal(
    PermissionType.EDIT,
    ResourceType.TEMPLATE,
    "projectTemplateId"
  ),
  TemplateController.getTemplateTask
);

// Create new project template task
router.post(
  "/template/project/:projectTemplateId/task/",
  authenticate,
  authorizeLocal(
    PermissionType.EDIT,
    ResourceType.TEMPLATE,
    "projectTemplateId"
  ),
  TemplateController.createTemplateTask
);

router.patch(
  "/template/project/:projectTemplateId/reorderTaks",
  authenticate,
  authorizeLocal(
    PermissionType.EDIT,
    ResourceType.TEMPLATE,
    "projectTemplateId"
  ),
  TemplateController.reorderTemplateTasks
);

// Update existing template task by id
router.patch(
  "/template/project/:projectTemplateId/task/:id",
  authenticate,
  authorizeLocal(
    PermissionType.EDIT,
    ResourceType.TEMPLATE,
    "projectTemplateId"
  ),
  TemplateController.updateTemplateTask
);

// Delete existing template task by id
router.delete(
  "/template/project/:projectTemplateId/task/:id",
  authenticate,
  authorizeLocal(
    PermissionType.EDIT,
    ResourceType.TEMPLATE,
    "projectTemplateId"
  ),
  TemplateController.deleteTemplateTask
);

// Get template project roles
router.get(
  "/template/project/:projectTemplateId/projectRoles",
  authenticate,
  authorizeLocal(
    PermissionType.READ,
    ResourceType.TEMPLATE,
    "projectTemplateId"
  ),
  TemplateController.getTemplateRoles
);

// Get template project role
router.get(
  "/template/project/:projectTemplateId/projectRole/:id",
  authenticate,
  authorizeLocal(
    PermissionType.READ,
    ResourceType.TEMPLATE,
    "projectTemplateId"
  ),
  TemplateController.getTemplateRole
);

// Create new project template role
router.post(
  "/template/project/:projectTemplateId/projectRole/",
  authenticate,
  authorizeLocal(
    PermissionType.EDIT,
    ResourceType.TEMPLATE,
    "projectTemplateId"
  ),
  TemplateController.createTemplateRole
);

// Update existing template role by id
router.patch(
  "/template/project/:projectTemplateId/projectRole/:id",
  authenticate,
  authorizeLocal(
    PermissionType.EDIT,
    ResourceType.TEMPLATE,
    "projectTemplateId"
  ),
  TemplateController.updateTemplateRole
);

// Update existing template role by id
router.patch(
  "/template/project/:projectTemplateId/projectRole/:id/tasks",
  authenticate,
  authorizeLocal(
    PermissionType.EDIT,
    ResourceType.TEMPLATE,
    "projectTemplateId"
  ),
  TemplateController.updateTemplateRoleTasks
);

// Delete existing template role by id
router.delete(
  "/template/project/:projectTemplateId/projectRole/:id",
  authenticate,
  authorizeLocal(
    PermissionType.EDIT,
    ResourceType.TEMPLATE,
    "projectTemplateId"
  ),
  TemplateController.deleteTemplateRole
);

export default router;
