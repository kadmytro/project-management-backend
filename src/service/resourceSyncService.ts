import { AppDataSource } from "../data-source";
import { FileItem } from "../entity/FileItem";
import { Resource } from "../entity/Resource";
import { FileType } from "../type/FileType";
import { ResourceType } from "../type/ResourceType";

export class ResourceSyncService {
  private resourceRepo = AppDataSource.getRepository(Resource);

  async findResource(type: ResourceType, entityId: number) {
    if (!entityId) {
      throw new Error("entity Id is required!");
    }
    return await this.resourceRepo.findOne({
      where: { type: type, entityId: entityId },
      relations: ["correspondingFolder"],
    });
  }

  async createOrUpdateCorrespondingFolder(
    resource: Resource,
    correspondingFolderName: string,
    isArchived?: boolean
  ) {
    if (resource.type === ResourceType.FILE) {
      throw new Error("Files cannot have corresponding folders.");
    }

    if (resource.correspondingFolder) {
      let hasChanged = false;
      if (resource.correspondingFolder.fileName !== correspondingFolderName) {
        resource.correspondingFolder.fileName = correspondingFolderName;
        hasChanged = true;
      }

      if (
        resource.correspondingFolder?.parent !==
        resource.parent?.correspondingFolder
      ) {
        resource.correspondingFolder.parent =
          resource.parent?.correspondingFolder ?? null;
        hasChanged = true;
      }

      if (
        isArchived !== undefined &&
        resource.correspondingFolder.isArchived !== isArchived
      ) {
        resource.correspondingFolder.isArchived = isArchived;
        hasChanged = true;
      }

      if (hasChanged) {
        await this.resourceRepo.save(resource);
      }
      return resource.correspondingFolder;
    }

    const fileRepository = AppDataSource.getRepository(FileItem);
    const folder = fileRepository.create({
      fileName: correspondingFolderName,
      type: FileType.FOLDER,
      correspondsToResource: resource,
      isArchived: isArchived ?? false,
    });

    if (resource.parent && resource.parent.correspondingFolder) {
      folder.parent = resource.parent?.correspondingFolder;
    }

    await fileRepository.save(folder);
    resource.correspondingFolder = folder;
    await this.resourceRepo.save(resource);

    return folder;
  }

  async createOrUpdateResource(
    type: ResourceType,
    entityId: number,
    parentResourceId?: number
  ) {
    let resource = await this.resourceRepo.findOne({
      where: { type, entityId },
      relations: ["correspondingFolder", "correspondingFolder.parent"],
    });

    if (!resource) {
      resource = this.resourceRepo.create({ type, entityId });
    }

    if (parentResourceId) {
      const parentResource = await this.resourceRepo.findOne({
        where: { id: parentResourceId },
        relations: ["correspondingFolder"],
      });

      if (parentResource && parentResource.id !== resource.parent?.id) {
        resource.parent = parentResource;

        if (resource.correspondingFolder) {
          resource.correspondingFolder.parent =
            parentResource.correspondingFolder ?? null;
        }
      }
    } else {
      resource.parent = null;
    }

    await this.resourceRepo.save(resource);
    return resource;
  }

  async deleteResource(type: ResourceType, entityId: number) {
    if (!type && !entityId) {
      throw new Error("Nothing is provided");
    }
    if (!type) {
      throw new Error("no type provided");
    }

    if (!entityId) {
      throw new Error("no entityId provided");
    }
    const resource = await this.resourceRepo.findOne({
      where: { type: type, entityId: entityId },
      relations: ["correspondingFolder"],
    });
    if (resource) {
      await this.resourceRepo.remove(resource);
    }
  }
}
