import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinTable,
  ManyToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Project } from "./Project";
import { User } from "./User";
import { Task } from "./Task";
import { LocalPermission } from "./LocalPermission";

@Entity({ name: "ProjectRoleSet" })
export class ProjectRole {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string; // e.g., "Coordinator", "Mentor", "Participant"

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ default: false })
  isManagingTeam!: boolean;

  @ManyToOne(() => Project, (project) => project.projectRoles, {
    onDelete: "CASCADE",
  })
  project!: Project;

  @ManyToMany(() => User, (user) => user.projectRoles)
  @JoinTable({
    name: "projectrole_user_links",
    joinColumn: {
      name: "projectRoleSetId",
      referencedColumnName: "id",
    },
    inverseJoinColumn: {
      name: "userSetId",
      referencedColumnName: "id",
    },
  })
  assignedUsers!: User[];

  @OneToMany(() => Task, (task) => task.assigneeRole)
  assignedTasks!: Task[];

  @OneToMany(() => Task, (task) => task.verifierRole)
  verifyingTasks!: Task[];

  @OneToMany(
    () => LocalPermission,
    (localPermission) => localPermission.projectRole
  )
  localPermissions!: LocalPermission[];

  @CreateDateColumn()
  createdOn!: Date;

  @UpdateDateColumn()
  updatedOn!: Date;

  getDetails() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      projectId: this.project?.id,
      isManagingTeam: this.isManagingTeam,
      assignedUserIds: this.assignedUsers?.map((u) => u.id),
      assignedTaskIds: this.assignedTasks?.map((t) => t.id),
      verifyingTaskIds: this.verifyingTasks?.map((t) => t.id),
      createdOn: this.createdOn,
      updatedOn: this.updatedOn,
    };
  }
}
