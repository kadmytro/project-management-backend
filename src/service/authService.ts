import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import { PermissionType } from "../type/PermissionType";
import { Resource } from "../entity/Resource";
import { GlobalPermissionSubject } from "../type/GlobalPermissionSubject";
import { LocalPermission } from "../entity/LocalPermission";
import { ResourceType } from "../type/ResourceType";
import { GlobalPermission } from "../entity/GlobalPermission";
import { Position } from "../entity/Position";

const SECRET_KEY = process.env.JWT_SECRET || "my-secret-key";

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => bcrypt.compare(password, hash);

export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, SECRET_KEY, { expiresIn: "1h" });
};

const mapResourceTypeToPermissionSubject = (
  type: ResourceType
): GlobalPermissionSubject => {
  switch (type) {
    case ResourceType.SUBTASK:
    case ResourceType.TASK:
    case ResourceType.PROJECT_PHASE:
    case ResourceType.PROJECT:
      return GlobalPermissionSubject.PROJECTS;
    case ResourceType.TEMPLATE:
      return GlobalPermissionSubject.TEMPLATES;
    case ResourceType.FILE:
      return GlobalPermissionSubject.FILES;
    default:
      return GlobalPermissionSubject.EVERYTHING;
  }
};

export const getUserGlobalPermissions = async (
  userId: string
): Promise<GlobalPermission[]> => {
  if (!userId) {
    return [];
  }
  const user = await AppDataSource.getRepository(User).findOne({
    where: { id: userId },
    relations: ["globalPermissions", "position", "position.globalPermissions"],
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user.globalPermissions.concat(user.position?.globalPermissions || []);
};

export const getUserProjectRoleLocalPermissions = async (
  userId: string
): Promise<LocalPermission[]> => {
  return await AppDataSource.getRepository(LocalPermission)
    .createQueryBuilder("localPermission")
    .innerJoin("localPermission.projectRole", "projectRole")
    .innerJoin("projectRole.assignedUsers", "user", "user.id = :userId", {
      userId,
    })
    .getMany();
};

export const getUserPositionLocalPermissions = async (
  userId: string
): Promise<LocalPermission[]> => {
  const user = await AppDataSource.getRepository(User).findOne({
    where: { id: userId },
    relations: ["position"],
  });

  if (!user) {
    throw new Error("User not found");
  }

  return getPositionLocalPermissions(user.position);
};

export const getPositionLocalPermissions = async (
  position: Position | null
): Promise<LocalPermission[]> => {
  if (!position) {
    return [];
  }
  const positionPermission = await AppDataSource.getRepository(
    LocalPermission
  ).find({
    where: { position: {id: position.id } },
    relations: ["resource", "position"],
  });

  return positionPermission;
};

export const hasGlobalPermission = async (
  userId: string,
  permissionSubject: GlobalPermissionSubject,
  action: PermissionType
): Promise<boolean> => {
  if (!userId) {
    return false;
  }
  const userGlobalPermissions = await getUserGlobalPermissions(userId);

  return checkGlobalPermission(
    userGlobalPermissions,
    permissionSubject,
    action
  );
};

export const getEntityResourceId = async (
  entityId: number,
  resourceType: ResourceType
): Promise<number | null> => {
  if (!entityId) {
    return null;
  }
  const resourceRepository = AppDataSource.getRepository(Resource);
  const resource = await resourceRepository.findOne({
    where: { entityId: entityId, type: resourceType },
  });

  const correspondingResource =
    !resource && resourceType === ResourceType.FILE
      ? await resourceRepository.findOne({
          where: { correspondingFolder: { id: entityId } },
        })
      : null;

  return resource?.id ?? correspondingResource?.id ?? null;
};

export const hasLocalPermission = async (
  userId: string,
  resourceId: number,
  action: PermissionType
): Promise<boolean> => {
  if (!userId) {
    return false;
  }
  const user = await AppDataSource.getRepository(User).findOne({
    where: { id: userId },
    relations: ["localPermissions", "localPermissions.resource", "position"],
  });

  if (!user) {
    throw new Error("User not found");
  }

  const resource = await AppDataSource.getRepository(Resource).findOne({
    where: { id: resourceId },
    relations: ["parent"],
  });

  if (!resource) {
    throw new Error("Resource not found");
  }

  const userLocalPermission =
    user.localPermissions.find((p) => p.resource.id === resourceId) ?? null;

  const positionPermission =
    user.position &&
    (await AppDataSource.getRepository(LocalPermission).findOne({
      where: { position: {id: user.position.id }, resource: { id: resourceId } },
      relations: ["resource", "position"],
    }));

  const rolePermissions = await AppDataSource.getRepository(LocalPermission)
    .createQueryBuilder("localPermission")
    .innerJoin("localPermission.projectRole", "projectRole")
    .innerJoin("projectRole.assignedUsers", "user", "user.id = :userId", {
      userId,
    })
    .where("localPermission.resource = :resourceId", { resourceId })
    .getMany();

  const globalPermissionSubject = mapResourceTypeToPermissionSubject(
    resource.type
  );

  const hasGlobal = await hasGlobalPermission(
    userId,
    globalPermissionSubject,
    action
  );

  if (hasGlobal) return true;

  const positionResult = checkLocalPermission(positionPermission, action);
  if (positionResult === false) return false;

  const userResult = checkLocalPermission(userLocalPermission, action);
  if (userResult === false) return false;

  const roleResult = rolePermissions.some((p) =>
    checkLocalPermission(p, action)
  );

  if (roleResult === false) return false;

  if (userResult || positionResult || roleResult) return true;

  const hasPermission =
    checkLocalPermission(userLocalPermission, action) ||
    checkLocalPermission(positionPermission, action) ||
    rolePermissions.some((p) => checkLocalPermission(p, action));

  if (hasPermission) return true;

  if (resource.parent) {
    const parentAction = [
      PermissionType.CREATE,
      PermissionType.DELETE,
    ].includes(action)
      ? PermissionType.EDIT
      : action;

    return hasLocalPermission(userId, resource.parent.id, parentAction);
  }

  return false;
};

export const hasGlobalPermissions = async (
  userId: string,
  subject: GlobalPermissionSubject,
  actions: PermissionType[]
): Promise<Record<PermissionType, boolean | null>> => {
  const results: Record<PermissionType, boolean | null> = {
    create: null,
    read: null,
    edit: null,
    delete: null,
  };

  if (!userId) {
    return results;
  }

  const userGlobalPermissions = await getUserGlobalPermissions(userId);

  for (const action of actions) {
    const isAllowed = checkGlobalPermission(
      userGlobalPermissions,
      subject,
      action
    );
    results[action] = isAllowed;
  }

  return results;
};

export const hasLocalPermissions = async (
  userId: string,
  resourceId: number,
  actions: PermissionType[],
  pastResults?: Record<PermissionType, boolean | null>
): Promise<Record<PermissionType, boolean | null>> => {
  const results: Record<PermissionType, boolean | null> = pastResults ?? {
    create: null,
    read: null,
    edit: null,
    delete: null,
  };

  if (!userId) {
    return results;
  }

  const user = await AppDataSource.getRepository(User).findOne({
    where: { id: userId },
    relations: ["localPermissions", "localPermissions.resource", "position"],
  });

  if (!user) {
    throw new Error("User not found");
  }

  const resource = await AppDataSource.getRepository(Resource).findOne({
    where: { id: resourceId },
    relations: ["parent"],
  });

  if (!resource) {
    throw new Error("Resource not found");
  }

  // Gather user, position, and role permissions
  const userLocalPermission = user.localPermissions.find(
    (p) => p.resource.id === resourceId
  );

  const positionPermission =
    user.position &&
    (await AppDataSource.getRepository(LocalPermission).findOne({
      where: { position: {id: user.position.id }, resource: { id: resourceId } },
      relations: ["resource", "position"],
    }));

  const rolePermissions = await AppDataSource.getRepository(LocalPermission)
    .createQueryBuilder("localPermission")
    .innerJoin("localPermission.projectRole", "projectRole")
    .innerJoin("projectRole.assignedUsers", "user", "user.id = :userId", {
      userId,
    })
    .where("localPermission.resource = :resourceId", { resourceId })
    .getMany();

  const globalPermissionSubject = mapResourceTypeToPermissionSubject(
    resource.type
  );

  const globalPermissions = await hasGlobalPermissions(
    userId,
    globalPermissionSubject,
    actions
  );

  for (const action of actions) {
    if (results[action] !== null) continue;
    if (globalPermissions[action]) {
      results[action] = true;
      continue;
    }

    const isAllowed =
      checkLocalPermission(userLocalPermission, action) ||
      checkLocalPermission(positionPermission, action) ||
      rolePermissions.some((p) => checkLocalPermission(p, action));

    results[action] = isAllowed;
  }

  if (resource.parent && actions.some((a) => results[a] === null)) {
    return hasLocalPermissions(userId, resource.parent.id, actions, results);
  }

  return results;
};

const localPermissionMap: Record<PermissionType, keyof LocalPermission> = {
  [PermissionType.READ]: "canRead",
  [PermissionType.CREATE]: "canCreate",
  [PermissionType.EDIT]: "canEdit",
  [PermissionType.DELETE]: "canDelete",
};

export const checkLocalPermission = (
  permission: LocalPermission | null = null,
  action: PermissionType
) => {
  const key = localPermissionMap[action];
  return permission?.[key] === true
    ? true
    : permission?.[key] === false
    ? false
    : null;
};

export const checkGlobalPermission = (
  permissions: GlobalPermission[],
  permissionSubject: GlobalPermissionSubject,
  action: PermissionType
): boolean => {
  const key = globalPermissionMap[action];
  return permissions.some(
    (p) =>
      (p.subject === permissionSubject && p[key]) ||
      (p.subject === GlobalPermissionSubject.EVERYTHING && p[key])
  );
};

const globalPermissionMap: Record<PermissionType, keyof GlobalPermission> = {
  [PermissionType.READ]: "canRead",
  [PermissionType.CREATE]: "canCreate",
  [PermissionType.EDIT]: "canEdit",
  [PermissionType.DELETE]: "canDelete",
};
