import { Router } from "express";
import { FileController } from "../controller/FileController";
import { authenticate } from "../middleware/authMiddleware";
import {
  authorizeGlobal,
  authorizeLocal,
} from "../middleware/permissionMiddleware";
import { GlobalPermissionSubject } from "../type/GlobalPermissionSubject";
import { PermissionType } from "../type/PermissionType";
import { ResourceType } from "../type/ResourceType";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.get(
  "/file",
  authenticate,
  authorizeGlobal(PermissionType.READ, GlobalPermissionSubject.FILES),
  FileController.getAllFileDetails
);

router.get(
  "/file/:id",
  authenticate,
  authorizeLocal(PermissionType.READ, ResourceType.FILE, "id"),
  FileController.downloadFileById
);

router.get(
  "/file/:id/details",
  authenticate,
  authorizeLocal(PermissionType.READ, ResourceType.FILE, "id"),
  FileController.getFileDetailsById
);

router.post(
  "/file/",
  authenticate,
  authorizeGlobal(PermissionType.CREATE, GlobalPermissionSubject.FILES),
  upload.single("file"),
  FileController.createFile
);

router.patch(
  "/file/:id",
  authenticate,
  authorizeLocal(PermissionType.EDIT, ResourceType.FILE, "id"),
  FileController.updateFile
);

router.delete(
  "/file/:id",
  authenticate,
  authorizeLocal(PermissionType.DELETE, ResourceType.FILE, "id"),
  FileController.deleteFile
);

export default router;
