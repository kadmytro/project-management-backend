import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { FileItem } from "../entity/FileItem";
import { User } from "../entity/User";
import { getErrorDetails } from "../utils/errorFormatter";
import { FileStorageManager } from "../service/FileStorageManager";
import {
  FileType,
  isValidFileType,
  isValidStorageType,
  StorageType,
} from "../type/FileType";

export class FileController {
  static async getAllFileDetails(req: Request, res: Response) {
    try {
      const fileRepository = AppDataSource.getTreeRepository(FileItem);

      const trees = await fileRepository.findTrees({
        relations: ["owner", "correspondsToResource"],
      });

      res.status(200).json(trees.map((tree) => tree.getDetails()));
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async getFileDetailsById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "File id is required" });
        return;
      }
      const fileRepository = AppDataSource.getTreeRepository(FileItem);

      const file = await fileRepository.findOne({
        where: { id: parseInt(id) },
        relations: ["owner", "parent", "children"],
      });

      if (!file) {
        res.status(404).json({ message: "File not found" });
        return;
      }

      const fileTree = await fileRepository.findDescendantsTree(file);

      res.status(200).json(fileTree.getDetails());
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async downloadFileById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ message: "File id is required" });
        return;
      }
      const fileRepository = AppDataSource.getRepository(FileItem);

      const file = await fileRepository.findOneBy({ id: parseInt(id) });
      if (!file) {
        res.status(404).json({ message: "File not found" });
        return;
      }

      if (file.type === FileType.FOLDER) {
        res.status(400).json({ message: "Folders cannot be downloaded" });
        return;
      }

      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${file.fileName}`
      );
      res.setHeader("Content-Type", "application/octet-stream");
      const fileStorageManager = new FileStorageManager(file.storageType);
      const fileBuffer = await fileStorageManager.downloadFile(file.filePath!);
      res.send(fileBuffer);
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async createFile(req: Request, res: Response) {
    try {
      const { fileType, storageType, ownerId, parentId, name } = req.body;
      const fileRepository = AppDataSource.getRepository(FileItem);
      const userRepository = AppDataSource.getRepository(User);
      const fileData = req.file;

      const owner = ownerId
        ? await userRepository.findOneBy({ id: ownerId })
        : null;

      if (ownerId && !owner) {
        res.status(404).json({ message: "Owner not found" });
        return;
      }

      if (fileType === FileType.FILE && !fileData) {
        res.status(400).json({ message: "File cannot be empty" });
        return;
      }

      if (fileType === FileType.FOLDER && fileData) {
        res.status(400).json({
          message:
            "You are uploading a file, while setting its type to 'folder'",
        });
        return;
      }

      if (fileType === FileType.FOLDER && !name) {
        res.status(400).json({ message: "Folder name is required" });
        return;
      }

      if (
        !fileType ||
        !isValidFileType(fileType) ||
        !storageType ||
        !isValidStorageType(storageType)
      ) {
        res.status(400).json({ message: "Invalid file type or storage type" });
        return;
      }

      const parent = parentId
        ? await fileRepository.findOne({
            where: { id: parentId },
            relations: ["correspondsToResource"],
          })
        : null;

      if (parent && parent.type === FileType.FILE) {
        res.status(400).json({ message: "Files cannot have children" });
        return;
      }

      const filePath =
        fileType === FileType.FILE && fileData
          ? `${Date.now()}-${fileData.originalname}`
          : null;

      const fileStorageManager = new FileStorageManager(storageType);
      const fileUrl =
        fileType === FileType.FILE && fileData && filePath
          ? await fileStorageManager.uploadFile(fileData.buffer, filePath)
          : null;

      const newFile = fileRepository.create({
        fileName: fileType === FileType.FILE ? fileData?.originalname : name,
        type: fileType,
        storageType: storageType,
        parent: parent,
        size: fileType === FileType.FILE ? fileData?.size : null,
        filePath: filePath,
        fileUrl: storageType === StorageType.CLOUD ? fileUrl : null,
        owner: owner,
      });

      await fileRepository.save(newFile);

      res.status(201).json({
        message: "File created successfully",
      });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async updateFile(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ message: "File id is required" });
        return;
      }
      const { fileName, ownerId, parentId } = req.body;

      const fileRepository = AppDataSource.getRepository(FileItem);
      const userRepository = AppDataSource.getRepository(User);

      const file = await fileRepository.findOne({
        where: { id: parseInt(id) },
        relations: ["owner", "parent", "correspondsToResource"],
      });

      if (
        fileName === undefined &&
        ownerId === undefined &&
        parentId === undefined
      ) {
        res.status(400).json({ message: "At least one field is required" });
        return;
      }

      if (!file) {
        res.status(404).json({ message: "File not found" });
        return;
      }

      if (file.correspondsToResource) {
        res.status(400).json({
          message: "Corresponding folders cannot be updated",
        });
        return;
      }

      if (fileName) file.fileName = fileName;

      if (ownerId !== undefined) {
        const owner = ownerId
          ? await userRepository.findOneBy({ id: ownerId })
          : null;
        file.owner = owner;
      }

      if (parentId !== undefined) {
        const newParent =
          parentId !== null
            ? await fileRepository.findOne({
                where: { id: parentId },
                relations: ["correspondsToResource"],
              })
            : null;
        file.parent = newParent;
      }

      await fileRepository.save(file);

      res.status(200).json({
        message: "File updated successfully",
      });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async deleteFile(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ message: "File id is required" });
        return;
      }
      const fileRepository = AppDataSource.getRepository(FileItem);

      const file = await fileRepository.findOne({
        where: { id: parseInt(id) },
        relations: ["correspondsToResource", "children"],
      });
      if (!file) {
        res.status(404).json({ message: "File not found" });
        return;
      }

      if (file.correspondsToResource) {
        res.status(400).json({
          message:
            "Corresponding folders cannot be deleted. You must delete the associated resource instead",
        });
        return;
      }

      await fileRepository.remove(file);

      res.status(200).json({ message: "File deleted successfully" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }
}
