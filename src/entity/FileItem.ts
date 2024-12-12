import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  AfterInsert,
  AfterUpdate,
  BeforeRemove,
  OneToOne,
  JoinColumn,
  TreeParent,
  TreeChildren,
  Tree,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./User";
import { ResourceSyncService } from "../service/resourceSyncService";
import { ResourceType } from "../type/ResourceType";
import { FileType, StorageType } from "../type/FileType";
import { FileStorageManager } from "../service/FileStorageManager";
import { Resource } from "./Resource";

interface FileDetails {
  id: number;
  fileName: string;
  ownerId?: string | null;
  children: FileDetails[];
  size: number | null;
  type: FileType;
  storageType: StorageType;
  parent?: number | null;
  createdOn: Date;
  updatedOn: Date;
  isArchided: boolean;
}

@Entity({ name: "FileItemSet" })
@Tree("closure-table")
export class FileItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  fileName!: string;

  @Column({ type: "enum", enum: FileType })
  type!: FileType;

  @TreeParent({ onDelete: "CASCADE" })
  parent!: FileItem | null;

  @TreeChildren()
  children!: FileItem[];

  @Column({ type: "bigint", nullable: true })
  size!: number | null;

  @Column({ type: "enum", enum: StorageType, default: StorageType.LOCAL })
  storageType!: StorageType;

  @Column({ type: "text", nullable: true })
  filePath!: string | null; // Relative path (local) or cloud key (cloud)

  @Column({ type: "text", nullable: true })
  fileUrl!: string | null; // Public URL for cloud files (optional)

  @ManyToOne(() => User, { nullable: true })
  owner!: User | null;

  @OneToOne(() => Resource, (resource) => resource.correspondingFolder, {
    nullable: true,
    onDelete: "CASCADE",
  })
  @JoinColumn()
  correspondsToResource!: Resource | null;

  @Column({ default: false })
  isArchived!: boolean;

  @CreateDateColumn()
  createdOn!: Date;

  @UpdateDateColumn()
  updatedOn!: Date;

  getDetails(): FileDetails {
    return {
      id: this.id,
      fileName: this.fileName,
      ownerId: this.owner?.id,
      children: this.children?.map((child) => child.getDetails()) || [],
      size: this.size,
      type: this.type,
      storageType: this.storageType,
      parent: this.parent?.id,
      createdOn: this.createdOn,
      updatedOn: this.updatedOn,
      isArchided: this.isArchived,
    };
  }

  @AfterInsert()
  @AfterUpdate()
  async createResource() {
    if (this.children?.length && this.type === FileType.FILE) {
      throw new Error("File items cannot have children.");
    }

    if (this.type === FileType.FILE && !this.filePath) {
      throw new Error("File items must have a file path.");
    }

    if (this.correspondsToResource) {
      return;
    }
    const resourceService = new ResourceSyncService();

    const parentResourceId = this.parent?.correspondsToResource
      ? this.parent.correspondsToResource.id
      : this.parent
      ? (await resourceService.findResource(ResourceType.FILE, this.parent.id))
          ?.id
      : undefined;

    if (parentResourceId) {
      await resourceService.createOrUpdateResource(
        ResourceType.FILE,
        this.id,
        parentResourceId
      );
    }
  }

  @BeforeRemove()
  async deleteResource() {
    const fileStorageManager = new FileStorageManager(this.storageType);
    const resourceService = new ResourceSyncService();
    await resourceService.deleteResource(ResourceType.FILE, this.id);
    try {
      if (this.type === FileType.FILE) {
        await fileStorageManager.deleteFile(this.filePath!);
        console.log(`File deleted: ${this.filePath}`);
      }
    } catch (err) {
      console.error(`Failed to delete file: ${this.filePath}, Error: ${err}`);
    }
  }
}
