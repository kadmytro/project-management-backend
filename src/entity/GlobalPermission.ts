import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { Position } from "./Position";
import { User } from "./User";
import { GlobalPermissionSubject } from "../type/GlobalPermissionSubject";

@Entity({ name: "GlobalPermissionSet" })
export class GlobalPermission {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "enum", enum: GlobalPermissionSubject })
  subject!: GlobalPermissionSubject;

  @Column({ default: false })
  canRead!: boolean;

  @Column({ default: false })
  canCreate!: boolean;

  @Column({ default: false })
  canEdit!: boolean;

  @Column({ default: false })
  canDelete!: boolean;

  @ManyToOne(() => User, { nullable: true, onDelete: "CASCADE" })
  user!: User | null;

  @ManyToOne(() => Position, { nullable: true, onDelete: "CASCADE" })
  position!: Position | null;

  getDetails() {
    return {
      id: this.id,
      subject: this.subject,
      canRead: this.canRead,
      canCreate: this.canCreate,
      canEdit: this.canEdit,
      canDelete: this.canDelete,
      userId: this.user?.id,
      positionId: this.position?.id,
    };
  }
}
