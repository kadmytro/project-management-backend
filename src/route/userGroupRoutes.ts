import express, { Request, Response } from "express";
import { authenticate } from "../middleware/authMiddleware";
import { authorizeGlobal } from "../middleware/permissionMiddleware";
import { GlobalPermissionSubject } from "../type/GlobalPermissionSubject";
import { PermissionType } from "../type/PermissionType";
import { UserGroupController } from "../controller/UserGroupController";

const router = express.Router();

router.get(
  "/userGroup",
  authenticate,
  authorizeGlobal(PermissionType.READ, GlobalPermissionSubject.USER_GROUPS),
  async (req: Request, res: Response) => {
    await UserGroupController.getAllGroups(req, res);
  }
);

router.get(
  "/userGroup/:id",
  authenticate,
  authorizeGlobal(PermissionType.READ, GlobalPermissionSubject.USER_GROUPS),
  async (req: Request, res: Response) => {
    await UserGroupController.getGroup(req, res);
  }
);

router.get(
  "/userGroup/:id/users",
  authenticate,
  authorizeGlobal(PermissionType.READ, GlobalPermissionSubject.USER_GROUPS),
  async (req: Request, res: Response) => {
    await UserGroupController.getGroupUsers(req, res);
  }
);

router.post(
  "/userGroup",
  authenticate,
  authorizeGlobal(PermissionType.CREATE, GlobalPermissionSubject.USER_GROUPS),
  async (req: Request, res: Response) => {
    await UserGroupController.createGroup(req, res);
  }
);

router.delete(
  "/userGroup/:id",
  authenticate,
  authorizeGlobal(PermissionType.DELETE, GlobalPermissionSubject.USER_GROUPS),
  async (req: Request, res: Response) => {
    await UserGroupController.deleteGroup(req, res);
  }
);

router.patch(
  "/userGroup/:id",
  authenticate,
  authorizeGlobal(PermissionType.EDIT, GlobalPermissionSubject.USER_GROUPS),
  UserGroupController.updateGroup
);

router.patch(
  "/userGroup/:id/users",
  authenticate,
  authorizeGlobal(PermissionType.EDIT, GlobalPermissionSubject.USER_GROUPS),
  UserGroupController.updateUserGroupUsers
);

export default router;
