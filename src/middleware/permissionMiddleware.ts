import { Request, Response, NextFunction } from "express";
import {
  getEntityResourceId,
  hasGlobalPermission,
  hasLocalPermission,
} from "../service/authService";
import { PermissionType } from "../type/PermissionType";
import { GlobalPermissionSubject } from "../type/GlobalPermissionSubject";
import { ResourceType } from "../type/ResourceType";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";

function isEnumValue(value: string, enumObject: any): boolean {
  return Object.values(enumObject).includes(value);
}
function castToGlobalPermissionSubject(
  value: string
): GlobalPermissionSubject | undefined {
  if (isEnumValue(value, GlobalPermissionSubject)) {
    return value as GlobalPermissionSubject;
  }
  return undefined;
}

export const authorizeGlobal = (
  requiredPermission: PermissionType,
  permissionSubject: GlobalPermissionSubject
) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const userId = req.user?.id;
    let isAuthorized = false;

    try {
      isAuthorized = await hasGlobalPermission(
        userId,
        permissionSubject,
        requiredPermission
      );

      if (!isAuthorized) {
        res.status(403).json({
          message: "Forbidden: You do not have the required permission",
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({ message: `Authorization error: ${error}` });
    }
  };
};

export const authorizeTaskRead = (
  resourceType: ResourceType,
  parameterEntityIdName: string
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (
      resourceType !== ResourceType.TASK &&
      resourceType !== ResourceType.SUBTASK
    ) {
      res.status(400).json({
        message: "Only tasks and subtasks may be authorized for submission!",
      });
      return;
    }

    if (!req.params[parameterEntityIdName]) {
      res.status(400).json({
        message: `request url parameter ${parameterEntityIdName} is not provided`,
      });
      return;
    }

    const resourceEntityId = parseInt(req.params[parameterEntityIdName]);
    const userId = req.user?.id;
    let isAuthorized = false;

    const user = await AppDataSource.getRepository(User).findOne({
      where: { id: userId },
      relations: ["tasksAssigned", "subtasksAssigned", "tasksVerifying"],
    });

    if (!user) {
      res.status(403).json({
        message: "User not found",
      });
      return;
    }

    if (resourceType === ResourceType.TASK) {
      isAuthorized =
        user.tasksAssigned?.some((t) => t.id === resourceEntityId) ||
        user.tasksVerifying?.some((t) => t.id === resourceEntityId);
    } else {
      isAuthorized = user.subtasksAssigned?.some(
        (s) => s.id === resourceEntityId
      );
    }
    if (!isAuthorized) {
      const resourceId = await getEntityResourceId(
        resourceEntityId,
        resourceType
      );

      if (!resourceId) {
        res.status(404).json({
          message: `Resource with the type ${resourceType} for entity with id ${resourceEntityId} not found`,
        });
        return;
      }

      isAuthorized = await hasLocalPermission(
        userId,
        resourceId,
        PermissionType.READ
      );
    }

    if (!isAuthorized) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    next();
  };
};

export const authorizeSubmission = (
  resourceType: ResourceType,
  parameterEntityIdName: string,
  isVerifying: boolean = false
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (
      resourceType !== ResourceType.TASK &&
      resourceType !== ResourceType.SUBTASK
    ) {
      res.status(400).json({
        message: "Only tasks and subtasks may be authorized for submission!",
      });
      return;
    }

    if (!req.params[parameterEntityIdName]) {
      res.status(400).json({
        message: `request url parameter ${parameterEntityIdName} is not provided`,
      });
      return;
    }

    const resourceEntityId = parseInt(req.params[parameterEntityIdName]);
    const userId = req.user?.id;
    let isAuthorized = false;

    const user = await AppDataSource.getRepository(User).findOne({
      where: { id: userId },
      relations: ["tasksAssigned", "subtasksAssigned", "tasksVerifying"],
    });

    if (!user) {
      res.status(403).json({
        message: "User not found",
      });
      return;
    }

    if (resourceType === ResourceType.TASK) {
      isAuthorized =
        (isVerifying &&
          user.tasksVerifying?.some((t) => t.id === resourceEntityId)) ||
        (!isVerifying &&
          user.tasksAssigned?.some((t) => t.id === resourceEntityId));
    } else {
      isAuthorized = user.subtasksAssigned?.some(
        (s) => s.id === resourceEntityId
      );
    }

    if (!isAuthorized) {
      const resourceId = await getEntityResourceId(
        resourceEntityId,
        resourceType
      );

      if (!resourceId) {
        res.status(404).json({
          message: `Resource with the type ${resourceType} for entity with id ${resourceEntityId} not found`,
        });
        return;
      }

      isAuthorized = await hasLocalPermission(
        userId,
        resourceId,
        PermissionType.EDIT
      );
    }

    if (!isAuthorized) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    next();
  };
};

export const authorizeLocal = (
  requiredPermission: PermissionType,
  resourceType: ResourceType,
  parameterEntityIdName: string
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    let isAuthorized = false;
    if (req.params[parameterEntityIdName]) {
      const resourceEntityId = parseInt(req.params[parameterEntityIdName]);
      const resourceId = await getEntityResourceId(
        resourceEntityId,
        resourceType
      );

      if (!resourceId) {
        res.status(404).json({
          message: `Resource with the type ${resourceType} for entity with id ${resourceEntityId} not found`,
        });
        return;
      }

      isAuthorized = await hasLocalPermission(
        userId,
        resourceId,
        requiredPermission
      );
    }

    if (!isAuthorized) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    next();
  };
};

export const authorizeFromRequestBody = (
  requiredPermission: PermissionType,
  resourceType: ResourceType,
  parameterEntityIdName: string
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    let isAuthorized = false;
    let resourceTypeToCheck = resourceType;
    let entityId = req.body[parameterEntityIdName];
    let permissionTypeToCheck = requiredPermission;
    let stopWhile = false;

    const mapPermissionToParentType = (
      type: PermissionType
    ): PermissionType => {
      return type === PermissionType.CREATE ||
        permissionTypeToCheck === PermissionType.EDIT
        ? PermissionType.EDIT
        : type;
    };
    while (!entityId && !stopWhile) {
      switch (resourceTypeToCheck) {
        case ResourceType.FILE:
          resourceTypeToCheck = ResourceType.SUBTASK;
          entityId = req.body["subtaskId"];
          permissionTypeToCheck = mapPermissionToParentType(
            permissionTypeToCheck
          );
          break;
        case ResourceType.SUBTASK:
          resourceTypeToCheck = ResourceType.TASK;
          entityId = req.body["taskId"];
          permissionTypeToCheck = mapPermissionToParentType(
            permissionTypeToCheck
          );
          break;
        case ResourceType.TASK:
          resourceTypeToCheck = ResourceType.PROJECT_PHASE;
          entityId = req.body["projectPhaseId"];
          permissionTypeToCheck = mapPermissionToParentType(
            permissionTypeToCheck
          );
          break;
        case ResourceType.PROJECT_PHASE:
          resourceTypeToCheck = ResourceType.PROJECT;
          entityId = req.body["projectId"];
          permissionTypeToCheck = mapPermissionToParentType(
            permissionTypeToCheck
          );
          break;
        default:
          stopWhile = true;
      }
    }

    if (entityId) {
      const resourceId = await getEntityResourceId(
        entityId,
        resourceTypeToCheck
      );

      if (!resourceId) {
        res.status(404).json({
          message: `Resource for entity with type ${resourceTypeToCheck} with id ${entityId} not found`,
        });
        return;
      }

      isAuthorized = await hasLocalPermission(
        userId,
        resourceId,
        permissionTypeToCheck
      );
    } else {
      res
        .status(400)
        .json({ message: "entity id is missing in the request body" });
      return;
    }

    if (!isAuthorized) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    next();
  };
};

export const authorizeFromRequestParameter = (
  requiredPermission: PermissionType,
  requestParameterName: string
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    let isAuthorized = false;
    if (req.params[requestParameterName]) {
      const resourceId = parseInt(req.params[requestParameterName]);
      isAuthorized = await hasLocalPermission(
        userId,
        resourceId,
        requiredPermission
      );
    }

    if (!isAuthorized) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    next();
  };
};

export const authorize = (
  requiredPermission: PermissionType,
  resourceId: number | null,
  globalPermissionSubject?: GlobalPermissionSubject
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    let isAuthorized = false;

    try {
      if (globalPermissionSubject) {
        isAuthorized = await hasGlobalPermission(
          userId,
          globalPermissionSubject,
          requiredPermission
        );
      } else if (resourceId !== null) {
        isAuthorized = await hasLocalPermission(
          userId,
          resourceId,
          requiredPermission
        );
      }

      if (!isAuthorized) {
        res.status(403).json({ message: "Forbidden" });
        return;
      }
    } catch (error) {
      res.status(500).json({ message: error });
      return;
    }

    next();
  };
};

// export const authorize = (requiredPermission: PermissionType) => {
//   return async (req: Request, res: Response, next: NextFunction) => {
//     const userId = req.user?.id;
//     let isAuthorized = false;

//     try {
//       if (req.params["permissionSubject"]) {
//         const permissionSubject = req.params["permissionSubject"];
//         const globalPermissionSubject =
//           castToGlobalPermissionSubject(permissionSubject);

//         if (globalPermissionSubject) {
//           isAuthorized = await hasGlobalPermission(
//             userId,
//             globalPermissionSubject,
//             requiredPermission
//           );
//         }
//       } else if (req.params["resourceId"]) {
//         const resourceId = parseInt(req.params.resourceId);

//         isAuthorized = await hasLocalPermission(
//           userId,
//           resourceId,
//           requiredPermission
//         );
//       }

//       if (!isAuthorized) {
//         return res.status(403).json({ message: "Forbidden" });
//       }
//     } catch (error) {
//       return res.status(500).json({ message: error });
//     }

//     next();
//   };
// };
