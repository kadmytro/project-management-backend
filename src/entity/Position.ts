import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./User";
import { GlobalPermission } from "./GlobalPermission";
import { LocalPermission } from "./LocalPermission";

@Entity({ name: "PositionSet" })
export class Position {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @OneToMany(() => User, (user) => user.position)
  users!: User[];

  @OneToMany(
    () => GlobalPermission,
    (globalPermission) => globalPermission.position
  )
  globalPermissions!: GlobalPermission[];

  @OneToMany(
    () => LocalPermission,
    (localPermission) => localPermission.position
  )
  localPermissions!: LocalPermission[];

  @Column({ default: false })
  isProtected!: boolean;

  @CreateDateColumn()
  createdOn!: Date;

  @UpdateDateColumn()
  updatedOn!: Date;

  @Column({ default: false })
  isArchived!: boolean;

  getDetails() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      userIds: this.users?.map((u) => u.id),
      globalPermissionIds: this.globalPermissions?.map((p) => p.id),
      localPermissionIds: this.localPermissions?.map((p) => p.id),
      createOn: this.createdOn,
      updatedOn: this.updatedOn,
      isArchived: this.isArchived,
    };
  }
}
