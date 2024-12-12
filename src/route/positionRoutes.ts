import express from "express";
import { PositionController } from "../controller/PositionController";
import { authenticate } from "../middleware/authMiddleware";
import { authorizeGlobal } from "../middleware/permissionMiddleware";
import { PermissionType } from "../type/PermissionType";
import { GlobalPermissionSubject } from "../type/GlobalPermissionSubject";

const router = express.Router();

// Get all positions
router.get(
  "/position/",
  authenticate,
  authorizeGlobal(PermissionType.READ, GlobalPermissionSubject.POSITIONS),
  PositionController.getAllPositions
);

// Get position by ID
router.get(
  "/position/:id",
  authenticate,
  authorizeGlobal(PermissionType.READ, GlobalPermissionSubject.POSITIONS),
  PositionController.getPositionById
);

// Get users by position ID
router.get(
  "/position/:id/users",
  authenticate,
  authorizeGlobal(PermissionType.READ, GlobalPermissionSubject.POSITIONS),
  PositionController.getPositionUsers
);

// Get position permissions
router.get(
  "/position/:id/permissions",
  authenticate,
  authorizeGlobal(PermissionType.READ, GlobalPermissionSubject.POSITIONS),
  PositionController.getPositionPermissions
);

// Create a new position
router.post(
  "/position/",
  authenticate,
  authorizeGlobal(PermissionType.CREATE, GlobalPermissionSubject.POSITIONS),
  PositionController.createPosition
);

// Edit position users
router.patch(
  "/position/:id/users",
  authenticate,
  authorizeGlobal(PermissionType.EDIT, GlobalPermissionSubject.POSITIONS),
  PositionController.updatePositionUsers
);

// Edit position permissions
router.patch(
  "/position/:id/permissions",
  authenticate,
  authorizeGlobal(PermissionType.EDIT, GlobalPermissionSubject.POSITIONS),
  PositionController.updatePositionPermissions
);

// Edit a position
router.patch(
  "/position/:id",
  authenticate,
  authorizeGlobal(PermissionType.EDIT, GlobalPermissionSubject.POSITIONS),
  PositionController.updatePosition
);

// Delete a position
router.delete(
  "/position/:id",
  authenticate,
  authorizeGlobal(PermissionType.DELETE, GlobalPermissionSubject.POSITIONS),
  PositionController.deletePosition
);

export default router;
