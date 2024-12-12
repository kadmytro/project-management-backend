import express, { NextFunction, Request, Response } from "express";
import { ProjectRoleController } from "../controller/ProjectRoleController";
import { authenticate } from "../middleware/authMiddleware";
import { PermissionType } from "../type/PermissionType";
import { ResourceType } from "../type/ResourceType";
import {
  getEntityResourceId,
  hasLocalPermission,
} from "../service/authService";
import { getErrorDetails } from "../utils/errorFormatter";

const router = express.Router();

const checkPermissionForProjectOfRole = (
  requiredPermission: PermissionType
) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      let isAuthorized = false;
      const userId = req.user?.id;

      if (!id) {
        res.status(400).json({ message: "Role id must be provided" });
        return;
      }

      const projectId = await ProjectRoleController.getProjectId(id);
      if (!projectId) {
        res.status(404).json({ message: "project with such role not found" });
        return;
      }
      const resourceId = await getEntityResourceId(
        projectId,
        ResourceType.PROJECT
      );

      if (!resourceId) {
        res.status(404).json({
          message: `Resource for project with id ${projectId} not found`,
        });
        return;
      }

      isAuthorized = await hasLocalPermission(
        userId,
        resourceId,
        requiredPermission
      );

      if (!isAuthorized) {
        res.status(403).json({ message: "Forbidden" });
        return;
      }

      next();
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  };
};

router.get(
  "/projectRole/:id",
  authenticate,
  checkPermissionForProjectOfRole(PermissionType.READ),
  ProjectRoleController.getProjectRoleById
);

router.get(
  "/projectRole/:id/users",
  authenticate,
  checkPermissionForProjectOfRole(PermissionType.READ),
  ProjectRoleController.getProjectRoleUsers
);

router.get(
  "/projectRole/:id/permissions",
  authenticate,
  checkPermissionForProjectOfRole(PermissionType.READ),
  ProjectRoleController.getProjectRolePermissions
);

router.get(
  "/projectRole/:id/assignedTasks",
  authenticate,
  checkPermissionForProjectOfRole(PermissionType.READ),
  ProjectRoleController.getAssignedTasks
);

router.get(
  "/projectRole/:id/verifyingTasks",
  authenticate,
  checkPermissionForProjectOfRole(PermissionType.READ),
  ProjectRoleController.getVerifyingTasks
);

router.patch(
  "/projectRole/:id",
  authenticate,
  checkPermissionForProjectOfRole(PermissionType.EDIT),
  ProjectRoleController.updateProjectRole
);

router.patch(
  "/projectRole/:id/users",
  authenticate,
  checkPermissionForProjectOfRole(PermissionType.EDIT),
  ProjectRoleController.updateProjectRoleUsers
);

router.patch(
  "/projectRole/:id/permissions",
  authenticate,
  checkPermissionForProjectOfRole(PermissionType.EDIT),
  ProjectRoleController.updateProjectRolePermissions //expected an array of objects of the following structure: [{ resourceId: Resource.id, canRead?: boolean | null, canEdit?: boolean | null, canDelete?: boolean | null, canCreate?: boolean | null}, {...}, ...]
);

router.patch(
  "/projectRole/:id/tasks",
  authenticate,
  checkPermissionForProjectOfRole(PermissionType.EDIT),
  ProjectRoleController.updateProjectRoleTasks
);

router.delete(
  "/projectRole/:id",
  authenticate,
  checkPermissionForProjectOfRole(PermissionType.EDIT),
  ProjectRoleController.deleteProjectRole
);

export default router;
