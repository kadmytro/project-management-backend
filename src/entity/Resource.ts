import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
} from "typeorm";
import { ResourceType } from "../type/ResourceType";
import { FileItem } from "./FileItem";

@Entity({ name: "ResourceSet" })
export class Resource {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "enum", enum: ResourceType })
  type!: ResourceType;

  @Column()
  entityId!: number;

  @ManyToOne(() => Resource, (resource) => resource.correspondingFolder, {
    nullable: true,
    onDelete: "CASCADE",
  })
  parent: Resource | null = null;

  @OneToMany(() => Resource, (resource) => resource.parent)
  @JoinColumn()
  children!: Resource[];

  @OneToOne(() => FileItem, (file) => file.correspondsToResource, {
    nullable: true,
    cascade: true,
  })
  @JoinColumn()
  correspondingFolder!: FileItem | null; // Folder associated with this resource.

  @BeforeInsert()
  @BeforeUpdate()
  validate() {
    if (this.type === ResourceType.FILE && this.correspondingFolder) {
      throw new Error("File resources cannot have corresponding folders.");
    }
  }

  getDetails() {
    return {
      id: this.id,
      type: this.type,
      entityId: this.entityId,
      parent: this.parent,
      children: this.children?.map((c) => c.getDetails),
    };
  }
}
