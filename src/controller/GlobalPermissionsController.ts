import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { GlobalPermission } from "../entity/GlobalPermission";
import { User } from "../entity/User";
import { hasGlobalPermissions } from "../service/authService";
import { GlobalPermissionSubject } from "../type/GlobalPermissionSubject";
import { PermissionType } from "../type/PermissionType";
import { Position } from "../entity/Position";
import { permissionTypeToKeyMap } from "../service/permissionService";
import { getErrorDetails } from "../utils/errorFormatter";

export class GlobalPermissionController {
  static async addUserGlobalPermissions(req: Request, res: Response) {
    const userRepository = AppDataSource.getRepository(User);
    const globalPermissionRepository =
      AppDataSource.getRepository(GlobalPermission);
    const currentUserId = req.user.id;
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ message: "User id is required" });
      return;
    }

    try {
      const targetUser = await userRepository.findOne({
        where: { id: id },
        relations: ["globalPermissions"],
      });

      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { globalPermissions } = req.body;

      for (const permissionData of globalPermissions) {
        const actions: PermissionType[] = [
          "canRead",
          "canCreate",
          "canEdit",
          "canDelete",
        ]
          .filter((key) => permissionData[key] !== undefined)
          .map(
            (key) =>
              key.replace("can", "").toLocaleLowerCase() as PermissionType
          );

        const permissionResults = await hasGlobalPermissions(
          currentUserId,
          permissionData.subject,
          actions
        );

        for (const action of actions) {
          if (!permissionResults[action]) {
            return res.status(403).json({
              message: `You do not have sufficient permissions to assign '${action}' for subject ${permissionData.subject}`,
            });
          }
        }
      }

      const updatedPermissions = globalPermissions.map(
        (permissionData: any) => {
          const existingPermission = targetUser.globalPermissions.find(
            (p) =>
              p.subject === (permissionData.subject as GlobalPermissionSubject)
          );

          const permission = existingPermission
            ? existingPermission
            : globalPermissionRepository.create({
                user: targetUser,
                subject: permissionData.subject as GlobalPermissionSubject,
              });

          type PermissionKey =
            | "canCreate"
            | "canRead"
            | "canEdit"
            | "canDelete";

          Object.entries(permissionData).forEach(([key, value]) => {
            if (
              (
                [
                  "canCreate",
                  "canRead",
                  "canEdit",
                  "canDelete",
                ] as PermissionKey[]
              ).includes(key as PermissionKey)
            ) {
              permission[key as PermissionKey] = value === true;
            }
          });

          return permission;
        }
      );

      await globalPermissionRepository.save(updatedPermissions);

      return res
        .status(200)
        .json({ message: "Global permissions updated successfully" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async updateUserGlobalPermissions(req: Request, res: Response) {
    const userRepository = AppDataSource.getRepository(User);
    const globalPermissionRepository =
      AppDataSource.getRepository(GlobalPermission);
    const currentUserId = req.user.id;

    const { id } = req.params;
    if (!id) {
      res.status(400).json({ message: "User id is required" });
      return;
    }

    try {
      const targetUser = await userRepository.findOne({
        where: { id: id },
        relations: ["globalPermissions"],
      });

      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { addGlobalPermissions, removeGlobalPermissions } = req.body;

      // **Process Remove Permissions First**
      if (removeGlobalPermissions) {
        for (const permissionData of removeGlobalPermissions) {
          const actionsToRemove: PermissionType[] = [
            "canCreate",
            "canRead",
            "canEdit",
            "canDelete",
          ]
            .filter(
              (key) =>
                permissionData[key] !== undefined &&
                permissionData[key] !== null
            )
            .map(
              (key) =>
                key.replace("can", "").toLocaleLowerCase() as PermissionType
            );

          const permissionResults = await hasGlobalPermissions(
            currentUserId,
            permissionData.subject,
            actionsToRemove
          );

          for (const action of actionsToRemove) {
            if (!permissionResults[action]) {
              return res.status(403).json({
                message: `You do not have sufficient permissions to remove '${action}' for subject ${permissionData.subject}`,
              });
            }
          }

          const permissionToRemove = targetUser.globalPermissions.find(
            (p) => p.subject === permissionData.subject
          );

          if (permissionToRemove) {
            actionsToRemove.forEach((action) => {
              const key = permissionTypeToKeyMap[action];
              permissionToRemove[key] = false;
            });

            if (
              !permissionToRemove.canCreate &&
              !permissionToRemove.canRead &&
              !permissionToRemove.canEdit &&
              !permissionToRemove.canDelete
            ) {
              await globalPermissionRepository.remove(permissionToRemove);
            } else {
              await globalPermissionRepository.save(permissionToRemove);
            }
          }
        }
      }

      if (addGlobalPermissions) {
        const updatedPermissions = await Promise.all(
          addGlobalPermissions.map(async (permissionData: any) => {
            const actionsToAdd = (
              ["canCreate", "canRead", "canEdit", "canDelete"] as const
            )
              .filter(
                (key) =>
                  permissionData[key] !== undefined &&
                  permissionData[key] !== null
              )
              .map(
                (key) =>
                  key.replace("can", "").toLocaleLowerCase() as PermissionType
              );

            // Validate current user's permissions to add
            const permissionResults = await hasGlobalPermissions(
              currentUserId,
              permissionData.subject,
              actionsToAdd
            );

            for (const action of actionsToAdd) {
              if (!permissionResults[action]) {
                throw new Error(
                  `You do not have sufficient permissions to assign '${action}' for subject ${permissionData.subject}`
                );
              }
            }

            const existingPermission = targetUser.globalPermissions.find(
              (p) => p.subject === permissionData.subject
            );

            const permission = existingPermission
              ? existingPermission
              : globalPermissionRepository.create({
                  user: targetUser,
                  subject: permissionData.subject,
                });

            // Set actions to true based on the input
            actionsToAdd.forEach((action) => {
              const key = permissionTypeToKeyMap[action];
              const value = permissionData[key];

              if (typeof value === "boolean") {
                permission[key] = value;
              }
            });

            return permission;
          })
        );

        await globalPermissionRepository.save(updatedPermissions);
      }

      return res
        .status(200)
        .json({ message: "Global permissions updated successfully" });
    } catch (error) {
      return res.status(500).json({
        message: "Internal server error",
        error: getErrorDetails(error),
      });
    }
  }

  static async addPositionGlobalPermissions(req: Request, res: Response) {
    const positionRepository = AppDataSource.getRepository(Position);
    const globalPermissionRepository =
      AppDataSource.getRepository(GlobalPermission);
    const currentUserId = req.user.id;

    const { id } = req.params;
    if (!id) {
      res.status(400).json({ message: "Position id is required" });
      return;
    }

    try {
      const targetPosition = await positionRepository.findOne({
        where: { id: id },
        relations: ["globalPermissions"],
      });

      if (!targetPosition) {
        return res.status(404).json({ message: "Position not found" });
      }

      const { globalPermissions } = req.body;

      for (const permissionData of globalPermissions) {
        const actions: PermissionType[] = [
          "canRead",
          "canCreate",
          "canEdit",
          "canDelete",
        ]
          .filter((key) => permissionData[key] !== undefined)
          .map(
            (key) =>
              key.replace("can", "").toLocaleLowerCase() as PermissionType
          );

        const permissionResults = await hasGlobalPermissions(
          currentUserId,
          permissionData.subject,
          actions
        );

        for (const action of actions) {
          if (!permissionResults[action]) {
            return res.status(403).json({
              message: `You do not have sufficient permissions to assign '${action}' for subject ${permissionData.subject}`,
            });
          }
        }
      }

      const updatedPermissions = globalPermissions.map(
        (permissionData: any) => {
          const existingPermission = targetPosition.globalPermissions.find(
            (p) =>
              p.subject === (permissionData.subject as GlobalPermissionSubject)
          );
          const permission = existingPermission
            ? existingPermission
            : globalPermissionRepository.create({
                position: targetPosition,
                subject: permissionData.subject as GlobalPermissionSubject,
              });

          type PermissionKey =
            | "canCreate"
            | "canRead"
            | "canEdit"
            | "canDelete";

          Object.entries(permissionData).forEach(([key, value]) => {
            if (
              (
                [
                  "canCreate",
                  "canRead",
                  "canEdit",
                  "canDelete",
                ] as PermissionKey[]
              ).includes(key as PermissionKey)
            ) {
              permission[key as PermissionKey] = value === true;
            }
          });

          return permission;
        }
      );

      await globalPermissionRepository.save(updatedPermissions);

      return res
        .status(200)
        .json({ message: "Global permissions updated successfully" });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Internal server error",
          error: getErrorDetails(error),
        });
      }
    }
  }

  static async updatePositionGlobalPermissions(req: Request, res: Response) {
    const positionRepository = AppDataSource.getRepository(Position);
    const globalPermissionRepository =
      AppDataSource.getRepository(GlobalPermission);
    const currentUserId = req.user.id;

    const { id } = req.params;
    if (!id) {
      res.status(400).json({ message: "Position id is required" });
      return;
    }

    try {
      const targetPosition = await positionRepository.findOne({
        where: { id: id },
        relations: ["globalPermissions"],
      });

      if (!targetPosition) {
        return res.status(404).json({ message: "Position not found" });
      }

      const { addGlobalPermissions, removeGlobalPermissions } = req.body;

      if (removeGlobalPermissions && Array.isArray(removeGlobalPermissions)) {
        for (const permissionData of removeGlobalPermissions) {
          const actionsToRemove: PermissionType[] = [
            "canCreate",
            "canRead",
            "canEdit",
            "canDelete",
          ]
            .filter(
              (key) =>
                permissionData[key] !== undefined &&
                permissionData[key] !== null
            )
            .map(
              (key) =>
                key.replace("can", "").toLocaleLowerCase() as PermissionType
            );

          const permissionResults = await hasGlobalPermissions(
            currentUserId,
            permissionData.subject,
            actionsToRemove
          );

          for (const action of actionsToRemove) {
            if (!permissionResults[action]) {
              return res.status(403).json({
                message: `You do not have sufficient permissions to remove '${action}' for subject ${permissionData.subject}`,
              });
            }
          }

          const permissionToRemove = targetPosition.globalPermissions.find(
            (p) => p.subject === permissionData.subject
          );

          if (permissionToRemove) {
            actionsToRemove.forEach((action) => {
              const key = permissionTypeToKeyMap[action];
              permissionToRemove[key] = false;
            });

            if (
              !permissionToRemove.canCreate &&
              !permissionToRemove.canRead &&
              !permissionToRemove.canEdit &&
              !permissionToRemove.canDelete
            ) {
              await globalPermissionRepository.remove(permissionToRemove);
            } else {
              await globalPermissionRepository.save(permissionToRemove);
            }
          }
        }
      }

      if (addGlobalPermissions && Array.isArray(addGlobalPermissions)) {
        const updatedPermissions = await Promise.all(
          addGlobalPermissions.map(async (permissionData: any) => {
            const actionsToAdd = (
              ["canCreate", "canRead", "canEdit", "canDelete"] as const
            )
              .filter(
                (key) =>
                  permissionData[key] !== undefined &&
                  permissionData[key] !== null
              )
              .map(
                (key) =>
                  key.replace("can", "").toLocaleLowerCase() as PermissionType
              );

            const permissionResults = await hasGlobalPermissions(
              currentUserId,
              permissionData.subject,
              actionsToAdd
            );

            for (const action of actionsToAdd) {
              if (!permissionResults[action]) {
                throw new Error(
                  `You do not have sufficient permissions to assign '${action}' for subject ${permissionData.subject}`
                );
              }
            }

            const existingPermission = targetPosition.globalPermissions.find(
              (p) => p.subject === permissionData.subject
            );
            const permission = existingPermission
              ? existingPermission
              : globalPermissionRepository.create({
                  position: targetPosition,
                  subject: permissionData.subject,
                });

            // Set actions to true based on the input
            actionsToAdd.forEach((action) => {
              const key = permissionTypeToKeyMap[action];
              const value = permissionData[key];

              if (typeof value === "boolean") {
                permission[key] = value;
              }
            });

            return permission;
          })
        );

        await globalPermissionRepository.save(updatedPermissions);
      }
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
