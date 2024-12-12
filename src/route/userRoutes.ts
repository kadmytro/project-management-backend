import express, { Request, Response } from "express";
import { authenticate } from "../middleware/authMiddleware";
import { UserController } from "../controller/UserController";
import { authorizeGlobal } from "../middleware/permissionMiddleware";
import { PermissionType } from "../type/PermissionType";
import { GlobalPermissionSubject } from "../type/GlobalPermissionSubject";

const router = express.Router();

router.post("/user/register", UserController.register);

router.post("/user/login", UserController.login);

router.get("/user/me", authenticate, UserController.getMyDetails);

router.get(
  "/user",
  authenticate,
  authorizeGlobal(PermissionType.READ, GlobalPermissionSubject.USERS),
  UserController.getAllUsers
);

router.get(
  "/user/:id/permissions",
  authenticate,
  authorizeGlobal(PermissionType.READ, GlobalPermissionSubject.USERS),
  UserController.getUserPermissions
);

router.get(
  "/user/:id",
  authenticate,
  authorizeGlobal(PermissionType.READ, GlobalPermissionSubject.USERS),
  UserController.getUserDetails
);

router.post(
  "/user",
  authenticate,
  authorizeGlobal(PermissionType.CREATE, GlobalPermissionSubject.USERS),
  UserController.createUser //When creating a user, you can only set the basic info. Permission, groups and other relations is possible to add only after the User exists;
);

router.delete(
  "/user/:id",
  authenticate,
  authorizeGlobal(PermissionType.DELETE, GlobalPermissionSubject.USERS),
  UserController.deleteUser
);

router.patch(
  "/user/change-password",
  authenticate,
  UserController.changePassword
);

router.patch("/user/forgot-password", UserController.requestPasswordReset);

router.patch("/user/reset-password/:token", UserController.resetPassword);

router.patch(
  "/user/:id",
  authenticate,
  authorizeGlobal(PermissionType.EDIT, GlobalPermissionSubject.USERS),
  UserController.updateUser
);

router.patch(
  "/user/:id/permissions",
  authenticate,
  authorizeGlobal(PermissionType.EDIT, GlobalPermissionSubject.USERS),
  UserController.updateUserPermissions
);

router.patch(
  "/user/:id/projectRoles",
  authenticate,
  authorizeGlobal(PermissionType.EDIT, GlobalPermissionSubject.USERS),
  UserController.updateUserProjectRoles
);

router.patch(
  "/user/:id/groups",
  authenticate,
  authorizeGlobal(PermissionType.EDIT, GlobalPermissionSubject.USERS),
  UserController.updateUserGroups
);

export default router;
