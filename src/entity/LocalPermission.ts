import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { Position } from "./Position";
import { ProjectRole } from "./ProjectRole";
import { Resource } from "./Resource";
import { User } from "./User";

@Entity({ name: "LocalPermissionSet" })
export class LocalPermission {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "boolean", nullable: true, default: null })
  canRead!: boolean | null;

  @Column({ type: "boolean", nullable: true, default: null })
  canCreate!: boolean | null;

  @Column({ type: "boolean", nullable: true, default: null })
  canEdit!: boolean | null;

  @Column({ type: "boolean", nullable: true, default: null })
  canDelete!: boolean | null;

  @ManyToOne(() => Resource, { onDelete: "CASCADE" })
  resource!: Resource;

  @ManyToOne(() => User, { nullable: true, onDelete: "CASCADE" })
  user!: User | null;

  @ManyToOne(() => Position, { nullable: true, onDelete: "CASCADE" })
  position!: Position | null;

  @ManyToOne(() => ProjectRole, (role) => role.localPermissions, { nullable: true, onDelete: "CASCADE" })
  projectRole!: ProjectRole | null;
    
  getDetails() {
    return {
      id: this.id,
      resource: this.resource.id,
      canRead: this.canRead,
      canCreate: this.canCreate,
      canEdit: this.canEdit,
      canDelete: this.canDelete,
      userId: this.user?.id,
      positionId: this.position?.id,
      projectRoleId: this.projectRole?.id,
    };
  }
}
