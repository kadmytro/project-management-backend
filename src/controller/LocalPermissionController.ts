import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { LocalPermission } from "../entity/LocalPermission";
import { User } from "../entity/User";
import { hasLocalPermissions } from "../service/authService";
import { PermissionType } from "../type/PermissionType";
import { Position } from "../entity/Position";
import { ProjectRole } from "../entity/ProjectRole";
import { permissionTypeToKeyMap } from "../service/permissionService";
import { getErrorDetails } from "../utils/errorFormatter";

export class LocalPermissionController {
  // static async addUserLocalPermissions(req: Request, res: Response) {
  //   const userRepository = AppDataSource.getRepository(User);
  //   const localPermissionRepository =
  //     AppDataSource.getRepository(LocalPermission);

  //   try {
  //     const currentUserId = req.user.id;
  //     const { addLocalPermissions } = req.body;
  //     const userId = req.params.id;

  //     if (!userId) {
  //       res.status(400).json({ message: "User id is required" });
  //       return;
  //     }

  //     const targetUser = await userRepository.findOne({
  //       where: { id: userId },
  //       relations: ["localPermissions", "localPermissions.resource"],
  //     });

  //     if (!targetUser) {
  //       return res.status(404).json({ message: "User not found" });
  //     }

  //     for (const permissionData of addLocalPermissions) {
  //       const actions: PermissionType[] = [
  //         "canRead",
  //         "canCreate",
  //         "canEdit",
  //         "canDelete",
  //       ]
  //         .filter((key) => permissionData[key] !== undefined)
  //         .map(
  //           (key) =>
  //             key.replace("can", "").toLocaleLowerCase() as PermissionType
  //         );

  //       const permissionResults = await hasLocalPermissions(
  //         currentUserId,
  //         permissionData.resourceId,
  //         actions
  //       );

  //       for (const action of actions) {
  //         if (!permissionResults[action]) {
  //           return res.status(403).json({
  //             message: `You do not have sufficient permissions to assign '${action}' for resource ID ${permissionData.resourceId}`,
  //           });
  //         }
  //       }
  //     }

  //     const updatedPermissions = addLocalPermissions.map(
  //       (permissionData: any) => {
  //         const existingPermission = targetUser.localPermissions.find(
  //           (p) => p.resource.id === permissionData.resourceId
  //         );
  //         const permission = existingPermission
  //           ? existingPermission
  //           : localPermissionRepository.create({
  //               user: targetUser,
  //               resource: { id: permissionData.resourceId },
  //             });

  //         type PermissionKey =
  //           | "canCreate"
  //           | "canRead"
  //           | "canEdit"
  //           | "canDelete";

  //         Object.entries(permissionData).forEach(([key, value]) => {
  //           if (
  //             (
  //               [
  //                 "canCreate",
  //                 "canRead",
  //                 "canEdit",
  //                 "canDelete",
  //               ] as PermissionKey[]
  //             ).includes(key as PermissionKey)
  //           ) {
  //             permission[key as PermissionKey] =
  //               typeof value === "boolean" ? value : null;
  //           }
  //         });
  //         return permission;
  //       }
  //     );

  //     await localPermissionRepository.save(updatedPermissions);

  //     res
  //       .status(200)
  //       .json({ message: "Local permissions updated successfully" });
  //   } catch (error) {
  //     if (!res.headersSent) {
  //       res.status(500).json({
  //         message: "Internal server error",
  //         error: getErrorDetails(error),
  //       });
  //     }
  //   }
  // }

  static async updateUserLocalPermissions(req: Request, res: Response) {
    const userRepository = AppDataSource.getRepository(User);
    const localPermissionRepository =
      AppDataSource.getRepository(LocalPermission);

    try {
      const currentUserId = req.user.id;
      const { addLocalPermissions, removeLocalPermissions } = req.body;
      const targetUserId = req.params.id;

      if (!targetUserId) {
        res.status(400).json({ message: "User id is required" });
        return;
      }

      const targetUser = await userRepository.findOne({
        where: { id: targetUserId },
        relations: ["localPermissions", "localPermissions.resource"],
      });

      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      if (
        (!removeLocalPermissions && !addLocalPermissions) ||
        !Array.isArray(addLocalPermissions) ||
        !Array.isArray(addLocalPermissions)
      ) {
        res.status(400).json({
          message:
            "something is wrong with the addLocalPermissions or removeLocalPermissions array",
        });
        return;
      }

      if (removeLocalPermissions && Array.isArray(removeLocalPermissions)) {
        for (const permissionData of removeLocalPermissions) {
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

          const permissionResults = await hasLocalPermissions(
            currentUserId,
            permissionData.resourceId,
            actionsToRemove
          );

          for (const action of actionsToRemove) {
            if (!permissionResults[action]) {
              return res.status(403).json({
                message: `You do not have sufficient permissions to remove '${action}' for resource ID ${permissionData.resourceId}`,
              });
            }
          }

          const permissionToRemove = targetUser.localPermissions.find(
            (p) => p.resource.id === permissionData.resourceId
          );

          if (permissionToRemove) {
            actionsToRemove.forEach((action) => {
              const key = permissionTypeToKeyMap[action];
              permissionToRemove[key] = null;
            });

            if (
              permissionToRemove.canCreate === null &&
              permissionToRemove.canRead === null &&
              permissionToRemove.canEdit === null &&
              permissionToRemove.canDelete === null
            ) {
              await localPermissionRepository.remove(permissionToRemove);
            } else {
              await localPermissionRepository.save(permissionToRemove);
            }
          }
        }
      }

      if (addLocalPermissions && Array.isArray(addLocalPermissions)) {
        const updatedPermissions = await Promise.all(
          addLocalPermissions.map(async (permissionData: any) => {
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
            const permissionResults = await hasLocalPermissions(
              currentUserId,
              permissionData.resourceId,
              actionsToAdd
            );

            for (const action of actionsToAdd) {
              if (!permissionResults[action]) {
                const message = `You do not have sufficient permissions to assign '${action}' for resource ID ${permissionData.resourceId}`;
                res.status(403).json({
                  message: message,
                });
                throw new Error(message);
              }
            }

            const existingPermission = targetUser.localPermissions.find(
              (p) => p.resource.id === permissionData.resourceId
            );

            const permission = existingPermission
              ? existingPermission
              : localPermissionRepository.create({
                  user: targetUser,
                  resource: { id: permissionData.resourceId },
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

        if (updatedPermissions) {
          await localPermissionRepository.save(updatedPermissions);
        }
      }

      if (!res.headersSent) {
        res
          .status(200)
          .json({ message: "Local permissions updated successfully" });
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

  // static async addPositionLocalPermissions(req: Request, res: Response) {
  //   const positionRepository = AppDataSource.getRepository(Position);
  //   const localPermissionRepository =
  //     AppDataSource.getRepository(LocalPermission);

  //   try {
  //     const currentUserId = req.user.id;
  //     const { addLocalPermissions } = req.body;
  //     const targetPositionId = req.params.id;

  //     if (!targetPositionId) {
  //       res.status(400).json({ message: "Position id is required" });
  //       return;
  //     }

  //     const targetPosition = await positionRepository.findOne({
  //       where: { id: targetPositionId },
  //       relations: ["localPermissions", "localPermissions.resource"],
  //     });

  //     if (!targetPosition) {
  //       return res.status(404).json({ message: "Position not found" });
  //     }

  //     for (const permissionData of addLocalPermissions) {
  //       const actions: PermissionType[] = [
  //         "canRead",
  //         "canCreate",
  //         "canEdit",
  //         "canDelete",
  //       ]
  //         .filter((key) => permissionData[key] !== undefined)
  //         .map(
  //           (key) =>
  //             key.replace("can", "").toLocaleLowerCase() as PermissionType
  //         );

  //       const permissionResults = await hasLocalPermissions(
  //         currentUserId,
  //         permissionData.resourceId,
  //         actions
  //       );

  //       for (const action of actions) {
  //         if (!permissionResults[action]) {
  //           return res.status(403).json({
  //             message: `You do not have sufficient permissions to assign '${action}' for resource ID ${permissionData.resourceId}`,
  //           });
  //         }
  //       }
  //     }

  //     const updatedPermissions = addLocalPermissions.map(
  //       (permissionData: any) => {
  //         const existingPermission = targetPosition.localPermissions.find(
  //           (p) => p.resource.id === permissionData.resourceId
  //         );

  //         const permission = existingPermission
  //           ? existingPermission
  //           : localPermissionRepository.create({
  //               position: targetPosition,
  //               resource: { id: permissionData.resourceId },
  //             });

  //         type PermissionKey =
  //           | "canCreate"
  //           | "canRead"
  //           | "canEdit"
  //           | "canDelete";

  //         Object.entries(permissionData).forEach(([key, value]) => {
  //           if (
  //             (
  //               [
  //                 "canCreate",
  //                 "canRead",
  //                 "canEdit",
  //                 "canDelete",
  //               ] as PermissionKey[]
  //             ).includes(key as PermissionKey)
  //           ) {
  //             permission[key as PermissionKey] =
  //               typeof value === "boolean" ? value : null;
  //           }
  //         });

  //         return permission;
  //       }
  //     );

  //     await localPermissionRepository.save(updatedPermissions);

  //     res
  //       .status(200)
  //       .json({ message: "Local permissions updated successfully" });
  //   } catch (error) {
  //     if (!res.headersSent) {
  //       res.status(500).json({
  //         message: "Internal server error",
  //         error: getErrorDetails(error),
  //       });
  //     }
  //   }
  // }

  static async updatePositionLocalPermissions(req: Request, res: Response) {
    const positionRepository = AppDataSource.getRepository(Position);
    const localPermissionRepository =
      AppDataSource.getRepository(LocalPermission);

    try {
      const currentUserId = req.user.id;
      const { addLocalPermissions, removeLocalPermissions } = req.body;
      const targetPositionId = req.params.id;

      if (!targetPositionId) {
        res.status(400).json({ message: "Position id is required" });
        return;
      }

      const targetPosition = await positionRepository.findOne({
        where: { id: targetPositionId },
        relations: ["localPermissions", "localPermissions.resource"],
      });

      if (!targetPosition) {
        res.status(404).json({ message: "Position not found" });
        return;
      }

      if (
        (!removeLocalPermissions && !addLocalPermissions) ||
        (!Array.isArray(addLocalPermissions) &&
          !Array.isArray(removeLocalPermissions))
      ) {
        res.status(400).json({
          message:
            "something is wrong with the addLocalPermissions or removeLocalPermissions array",
        });
        return;
      }

      if (removeLocalPermissions && Array.isArray(removeLocalPermissions)) {
        for (const permissionData of removeLocalPermissions) {
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

          const permissionResults = await hasLocalPermissions(
            currentUserId,
            permissionData.resourceId,
            actionsToRemove
          );

          for (const action of actionsToRemove) {
            if (!permissionResults[action]) {
              res.status(403).json({
                message: `You do not have sufficient permissions to remove '${action}' for resource ID ${permissionData.resourceId}`,
              });
              return;
            }
          }

          const permissionToRemove = targetPosition.localPermissions.find(
            (p) => p.resource.id === permissionData.resourceId
          );

          if (permissionToRemove) {
            actionsToRemove.forEach((action) => {
              const key = permissionTypeToKeyMap[action];
              permissionToRemove[key] = null;
            });

            if (
              permissionToRemove.canCreate === null &&
              permissionToRemove.canRead === null &&
              permissionToRemove.canEdit === null &&
              permissionToRemove.canDelete === null
            ) {
              await localPermissionRepository.remove(permissionToRemove);
            } else {
              await localPermissionRepository.save(permissionToRemove);
            }
          }
        }
      }

      if (addLocalPermissions && Array.isArray(addLocalPermissions)) {
        const updatedPermissions = await Promise.all(
          addLocalPermissions.map(async (permissionData: any) => {
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
            const permissionResults = await hasLocalPermissions(
              currentUserId,
              permissionData.resourceId,
              actionsToAdd
            );

            for (const action of actionsToAdd) {
              if (!permissionResults[action]) {
                const message = `You do not have sufficient permissions to assign '${action}' for resource ID ${permissionData.resourceId}`;
                res.status(403).json({
                  message: message,
                });
                throw new Error(message);
              }
            }

            const existingPermission = targetPosition.localPermissions.find(
              (p) => p.resource.id === permissionData.resourceId
            );

            const permission = existingPermission
              ? existingPermission
              : localPermissionRepository.create({
                  position: targetPosition,
                  resource: { id: permissionData.resourceId },
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

        await localPermissionRepository.save(updatedPermissions);
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

  // static async addRolePermissions(req: Request, res: Response) {
  //   const roleRepository = AppDataSource.getRepository(ProjectRole);
  //   const localPermissionRepository =
  //     AppDataSource.getRepository(LocalPermission);

  //   try {
  //     const currentUserId = req.user.id;
  //     const { addLocalPermissions } = req.body;
  //     const targetRoleId = req.params.id;

  //     if (!targetRoleId) {
  //       res.status(400).json({ message: "Role id is required" });
  //       return;
  //     }

  //     const targetRole = await roleRepository.findOne({
  //       where: { id: parseInt(targetRoleId) },
  //       relations: ["localPermissions", "localPermissions.resource"],
  //     });

  //     if (!targetRole) {
  //       return res.status(404).json({ message: "Project role not found" });
  //     }

  //     for (const permissionData of addLocalPermissions) {
  //       const actions: PermissionType[] = [
  //         "canRead",
  //         "canCreate",
  //         "canEdit",
  //         "canDelete",
  //       ]
  //         .filter((key) => permissionData[key] !== undefined)
  //         .map(
  //           (key) =>
  //             key.replace("can", "").toLocaleLowerCase() as PermissionType
  //         );

  //       const permissionResults = await hasLocalPermissions(
  //         currentUserId,
  //         permissionData.resourceId,
  //         actions
  //       );

  //       for (const action of actions) {
  //         if (!permissionResults[action]) {
  //           return res.status(403).json({
  //             message: `You do not have sufficient permissions to assign '${action}' for resource ID ${permissionData.resourceId}`,
  //           });
  //         }
  //       }
  //     }

  //     const updatedPermissions = addLocalPermissions.map(
  //       (permissionData: any) => {
  //         const existingPermission = targetRole.localPermissions.find(
  //           (p) => p.resource.id === permissionData.resourceId
  //         );

  //         const permission = existingPermission
  //           ? existingPermission
  //           : localPermissionRepository.create({
  //               projectRole: targetRole,
  //               resource: { id: permissionData.resourceId },
  //             });

  //         type PermissionKey =
  //           | "canCreate"
  //           | "canRead"
  //           | "canEdit"
  //           | "canDelete";

  //         Object.entries(permissionData).forEach(([key, value]) => {
  //           if (
  //             (
  //               [
  //                 "canCreate",
  //                 "canRead",
  //                 "canEdit",
  //                 "canDelete",
  //               ] as PermissionKey[]
  //             ).includes(key as PermissionKey)
  //           ) {
  //             permission[key as PermissionKey] =
  //               typeof value === "boolean" ? value : null;
  //           }
  //         });

  //         return permission;
  //       }
  //     );

  //     await localPermissionRepository.save(updatedPermissions);

  //     res
  //       .status(200)
  //       .json({ message: "Local permissions updated successfully" });
  //   } catch (error) {
  //     if (!res.headersSent) {
  //       res.status(500).json({
  //         message: "Internal server error",
  //         error: getErrorDetails(error),
  //       });
  //     }
  //   }
  // }

  static async updateRolePermissions(req: Request, res: Response) {
    const roleRepository = AppDataSource.getRepository(ProjectRole);
    const localPermissionRepository =
      AppDataSource.getRepository(LocalPermission);

    try {
      const currentUserId = req.user.id;
      const { addLocalPermissions, removeLocalPermissions } = req.body;
      const targetRoleId = req.params.id;

      if (!targetRoleId) {
        res.status(400).json({ message: "Role id is required" });
        return;
      }

      const targetRole = await roleRepository.findOne({
        where: { id: parseInt(targetRoleId) },
        relations: ["localPermissions", "localPermissions.resource"],
      });

      if (!targetRole) {
        res.status(404).json({ message: "Role not found" });
        return;
      }

      if (
        (!removeLocalPermissions && !addLocalPermissions) ||
        !Array.isArray(addLocalPermissions) ||
        !Array.isArray(addLocalPermissions)
      ) {
        res.status(400).json({
          message:
            "something is wrong with the addLocalPermissions or removeLocalPermissions array",
        });
        return;
      }

      if (removeLocalPermissions && Array.isArray(removeLocalPermissions)) {
        for (const permissionData of removeLocalPermissions) {
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

          const permissionResults = await hasLocalPermissions(
            currentUserId,
            permissionData.resourceId,
            actionsToRemove
          );

          for (const action of actionsToRemove) {
            if (!permissionResults[action]) {
              res.status(403).json({
                message: `You do not have sufficient permissions to remove '${action}' for resource ID ${permissionData.resourceId}`,
              });
              return;
            }
          }

          const permissionToRemove = targetRole.localPermissions.find(
            (p) => p.resource.id === permissionData.resourceId
          );

          if (permissionToRemove) {
            actionsToRemove.forEach((action) => {
              const key = permissionTypeToKeyMap[action];
              permissionToRemove[key] = null;
            });

            if (
              permissionToRemove.canCreate === null &&
              permissionToRemove.canRead === null &&
              permissionToRemove.canEdit === null &&
              permissionToRemove.canDelete === null
            ) {
              await localPermissionRepository.remove(permissionToRemove);
            } else {
              await localPermissionRepository.save(permissionToRemove);
            }
          }
        }
      }

      if (addLocalPermissions && Array.isArray(addLocalPermissions)) {
        const updatedPermissions = await Promise.all(
          addLocalPermissions.map(async (permissionData: any) => {
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
            const permissionResults = await hasLocalPermissions(
              currentUserId,
              permissionData.resourceId,
              actionsToAdd
            );

            for (const action of actionsToAdd) {
              if (!permissionResults[action]) {
                const message = `You do not have sufficient permissions to assign '${action}' for resource ID ${permissionData.resourceId}`;
                res.status(403).json({
                  message: message,
                });
                throw new Error(message);
              }
            }

            const existingPermission = targetRole.localPermissions.find(
              (p) => p.resource.id === permissionData.resourceId
            );

            const permission = existingPermission
              ? existingPermission
              : localPermissionRepository.create({
                  projectRole: targetRole,
                  resource: { id: permissionData.resourceId },
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
        await localPermissionRepository.save(updatedPermissions);
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
