import { In } from "typeorm";
import { User } from "../entity/User";
import { Resource } from "../entity/Resource";
import { GlobalPermission } from "../entity/GlobalPermission";
import { LocalPermission } from "../entity/LocalPermission";
import { AppDataSource } from "../data-source";
import { Position } from "../entity/Position";
import { PermissionType } from "../type/PermissionType";
import { ResourceType } from "../type/ResourceType";
import { ProjectRole } from "../entity/ProjectRole";

type UserPermissionsResponse = {
  localPermissions: {
    user: PermissionEntry[];
    position: PermissionEntry[];
    projectRoles: PermissionEntry[];
  };
  globalPermissions: {
    user: GlobalPermissionEntry[];
    position: GlobalPermissionEntry[];
  };
};

type PositionPermissionResponse = {
  localPermissions: PermissionEntry[];
  globalPermissions: GlobalPermissionEntry[];
};

type PermissionEntry = {
  resourceId: number;
  resourceType: ResourceType;
  entityId: number;
  canRead: boolean | null;
  canCreate: boolean | null;
  canEdit: boolean | null;
  canDelete: boolean | null;
};

type GlobalPermissionEntry = {
  subject: string;
  canRead: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export async function getUserPermissions(
  userId: string
): Promise<UserPermissionsResponse> {
  const userRepository = AppDataSource.getRepository(User);

  const user = await userRepository.findOne({
    where: { id: userId },
    relations: [
      "position",
      "globalPermissions",
      "localPermissions",
      "localPermissions.resource",
      "managingProjects",
      "participatingInProjects",
      "projectRoles",
    ],
  });

  if (!user) throw new Error("User not found");

  const userGlobalPermissions = user.globalPermissions.map((gp) =>
    formatGlobalPermission(gp)
  );
  const positionGlobalPermissions = user.position
    ? (
        await AppDataSource.getRepository(GlobalPermission).find({
          where: { position: { id: user.position.id } },
        })
      ).map((gp) => formatGlobalPermission(gp))
    : [];

  const userLocalPermissions = await fetchLocalPermissionsForUser(
    user.localPermissions
  );
  const positionLocalPermissions = user.position
    ? await fetchLocalPermissionsForPosition(user.position)
    : [];
  const projectRolePermissions = await fetchLocalPermissionsForProjectRoles(
    user.projectRoles
  );

  return {
    localPermissions: {
      user: userLocalPermissions,
      position: positionLocalPermissions,
      projectRoles: projectRolePermissions,
    },
    globalPermissions: {
      user: userGlobalPermissions,
      position: positionGlobalPermissions,
    },
  };
}

export async function getPositionPermissions(
  positionId: string
): Promise<PositionPermissionResponse> {
  const positionRepository = AppDataSource.getRepository(Position);
  const position = await positionRepository.findOne({
    where: { id: positionId },
  });

  if (!position) {
    throw new Error("Position not found");
  }

  const localPermissions = await fetchLocalPermissionsForPosition(position);
  const globalPermissions = (
    await AppDataSource.getRepository(GlobalPermission).find({
      where: { position: { id: positionId } },
    })
  ).map((gp) => formatGlobalPermission(gp));

  return {
    localPermissions: localPermissions,
    globalPermissions: globalPermissions,
  };
}

export async function getProjectRolePermissions(
  roleId: string
): Promise<PermissionEntry[]> {
  const projectRoleRepository = AppDataSource.getRepository(ProjectRole);
  const role = await projectRoleRepository.findOne({
    where: { id: parseInt(roleId) },
  });

  if (!role) {
    return [];
  }
  const permissions = await fetchLocalPermissionsForProjectRoles([role]);
  return permissions;
}

async function fetchLocalPermissionsForUser(
  localPermissions: LocalPermission[]
): Promise<PermissionEntry[]> {
  return resolvePermissionsWithHierarchy(
    localPermissions.map((lp) => ({
      resourceId: lp.resource.id,
      entityId: lp.resource.entityId,
      resourceType: lp.resource.type,
      canRead: lp.canRead,
      canCreate: lp.canCreate,
      canEdit: lp.canEdit,
      canDelete: lp.canDelete,
    }))
  );
}

async function fetchLocalPermissionsForPosition(
  position: Position
): Promise<PermissionEntry[]> {
  const permissions = await AppDataSource.getRepository(LocalPermission).find({
    where: { position: { id: position.id } },
    relations: ["resource"],
  });
  return resolvePermissionsWithHierarchy(
    permissions.map((lp) => ({
      resourceId: lp.resource.id,
      entityId: lp.resource.entityId,
      resourceType: lp.resource.type,
      canRead: lp.canRead,
      canCreate: lp.canCreate,
      canEdit: lp.canEdit,
      canDelete: lp.canDelete,
    }))
  );
}

async function fetchLocalPermissionsForProjectRoles(
  projectRoles: ProjectRole[]
): Promise<PermissionEntry[]> {
  const roleIds = projectRoles.map((role) => role.id);
  const localPermissions = await AppDataSource.getRepository(
    LocalPermission
  ).find({
    where: { projectRole: In(roleIds) },
    relations: ["resource"],
  });

  return resolvePermissionsWithHierarchy(
    localPermissions.map((lp) => ({
      resourceId: lp.resource.id,
      entityId: lp.resource.entityId,
      resourceType: lp.resource.type,
      canRead: lp.canRead,
      canCreate: lp.canCreate,
      canEdit: lp.canEdit,
      canDelete: lp.canDelete,
    }))
  );
}

async function resolvePermissionsWithHierarchy(
  permissions: PermissionEntry[]
): Promise<PermissionEntry[]> {
  const resourceRepository = AppDataSource.getRepository(Resource);

  const resolvedPermissions: PermissionEntry[] = [];

  async function resolveForResource(
    perm: PermissionEntry,
    resourceId: number
  ): Promise<void> {
    const resource = await resourceRepository.findOne({
      where: { id: resourceId },
      relations: ["children"],
    });

    if (resource) {
      resolvedPermissions.push(perm);

      for (const child of resource.children) {
        const childPerm: PermissionEntry = {
          resourceId: child.id,
          entityId: child.entityId,
          resourceType: child.type,
          canRead: (perm.canRead || perm.canEdit) ?? null,
          canCreate: perm.canEdit ?? null,
          canEdit: perm.canEdit ?? null,
          canDelete: (perm.canDelete || perm.canEdit) ?? null,
        };
        await resolveForResource(childPerm, child.id);
      }
    }
  }

  // Iterate through initial permissions and start recursion
  for (const perm of permissions) {
    await resolveForResource(perm, perm.resourceId);
  }

  return resolvedPermissions;
}

function formatGlobalPermission(
  permission: GlobalPermission
): GlobalPermissionEntry {
  return {
    subject: permission.subject,
    canRead: permission.canRead,
    canCreate: permission.canCreate,
    canEdit: permission.canEdit,
    canDelete: permission.canDelete,
  };
}
type PermissionKeys = "canRead" | "canCreate" | "canEdit" | "canDelete";

export const permissionTypeToKeyMap: Record<PermissionType, PermissionKeys> = {
  [PermissionType.READ]: "canRead",
  [PermissionType.CREATE]: "canCreate",
  [PermissionType.EDIT]: "canEdit",
  [PermissionType.DELETE]: "canDelete",
};
