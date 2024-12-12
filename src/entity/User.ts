import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { UserGroup } from "./UserGroup";
import { Position } from "./Position";
import { GlobalPermission } from "./GlobalPermission";
import { LocalPermission } from "./LocalPermission";
import { Project } from "./Project";
import { ProjectRole } from "./ProjectRole";
import { Task } from "./Task";
import { Subtask } from "./Subtask";

@Entity({ name: "UserSet" })
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  username!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ type: "text", nullable: true })
  firstName!: string | null;

  @Column({ type: "text", nullable: true })
  lastName!: string | null;

  @Column()
  password!: string;

  @Column({ default: false })
  emailVerified!: boolean;

  @ManyToOne(() => Position, (position) => position.users, {
    nullable: true,
    onDelete: "SET NULL",
  })
  position!: Position | null;

  @ManyToMany(() => UserGroup, (group) => group.users)
  groups!: UserGroup[];

  @ManyToMany(() => Project, (proj) => proj.managingTeam)
  managingProjects!: Project[];

  @ManyToMany(() => Project, (proj) => proj.participantsTeam)
  participatingInProjects!: Project[];

  @ManyToMany(() => ProjectRole, (role) => role.assignedUsers)
  projectRoles!: ProjectRole[];

  @OneToMany(() => Task, (task) => task.assignee)
  tasksAssigned!: Task[];

  @OneToMany(() => Subtask, (subtask) => subtask.assignee)
  subtasksAssigned!: Subtask[];

  @OneToMany(() => Task, (task) => task.verifier)
  tasksVerifying!: Task[];

  @OneToMany(
    () => GlobalPermission,
    (globalPermission) => globalPermission.user
  )
  globalPermissions!: GlobalPermission[];

  @OneToMany(() => LocalPermission, (localPermission) => localPermission.user)
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
      username: this.username,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      positionId: this.position?.id,
      groupIds: this.groups?.map((g) => g.id),
      managingProjectIds: this.managingProjects?.map((p) => p.id),
      participatingInProjectIds: this.participatingInProjects?.map((p) => p.id),
      projectRoleIds: this.projectRoles?.map((p) => p.id),
      globalPermissions: this.globalPermissions,
      localPermissions: this.localPermissions,
      tasksAssignedIds: this.tasksAssigned?.map((t) => t.id),
      subtasksAssignedIds: this.subtasksAssigned?.map((s) => s.id),
      tasksVerifyingIds: this.tasksVerifying?.map((t) => t.id),
      createdOn: this.createdOn,
      updatedOn: this.updatedOn,
      isArchived: this.isArchived,
    };
  }

  getShortDisplayName() {
    return this.firstName
      ? `${this.firstName} ${this.lastName?.[0]}.`
      : this.username;
  }
}
