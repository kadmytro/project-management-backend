import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
  JoinTable,
  AfterInsert,
  AfterUpdate,
  BeforeRemove,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Task } from "./Task";
import { ProjectRole } from "./ProjectRole";
import { ResourceType } from "../type/ResourceType";
import { ProjectPhase } from "./ProjectPhase";
import { FileItem } from "./FileItem";
import { ResourceSyncService } from "../service/resourceSyncService";
import { User } from "./User";

@Entity({ name: "ProjectSet" })
export class Project {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @ManyToMany(() => User, (user) => user.managingProjects)
  @JoinTable({ name: "project_managing_user_links" })
  managingTeam!: User[];

  @ManyToMany(() => User, (user) => user.participatingInProjects)
  @JoinTable({ name: "project_participant_user_links" })
  participantsTeam!: User[];

  @OneToMany(() => ProjectPhase, (phase) => phase.project, { cascade: true })
  phases!: ProjectPhase[];

  @OneToMany(() => Task, (task) => task.project, { cascade: true })
  tasks!: Task[];

  @OneToMany(() => ProjectRole, (role) => role.project, { cascade: true })
  projectRoles!: ProjectRole[];

  @Column({ default: false })
  isCompleted!: boolean;

  @Column({ default: false })
  isArchived!: boolean;

  @Column({ type: "date", nullable: true })
  startDate!: Date | null;

  @Column({ type: "date", nullable: true })
  endDate!: Date | null;

  @CreateDateColumn()
  createdOn!: Date;

  @UpdateDateColumn()
  updatedOn!: Date;

  getDetails() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      managingTeam: this.managingTeam?.map((u) => u.id),
      participantsTeam: this.participantsTeam?.map((u) => u.id),
      phaseIds: this.phases?.map((p) => p.id),
      taskIds: this.tasks?.map((t) => t.id),
      projectRoleIds: this.projectRoles?.map((r) => r.id),
      isCompleted: this.isCompleted,
      startDate: this.startDate,
      endDate: this.endDate,
      createdOn: this.createdOn,
      updatedOn: this.updatedOn,
      isArchided: this.isArchived,
    };
  }

  getFullDetails() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      managingTeam: this.managingTeam?.map((u) => u.getDetails()),
      participantsTeam: this.participantsTeam?.map((u) => u.getDetails()),
      phases: this.phases?.map((p) => p.getDetails()),
      tasks: this.tasks?.map((t) => t.getDetails()),
      projectRoles: this.projectRoles?.map((r) => r.getDetails()),
      isCompleted: this.isCompleted,
      startDate: this.startDate,
      endDate: this.endDate,
      createdOn: this.createdOn,
      updatedOn: this.updatedOn,
      isArchided: this.isArchived,
    };
  }

  @AfterInsert()
  @AfterUpdate()
  async createResource() {
    const resourceService = new ResourceSyncService();
    const resource = await resourceService.createOrUpdateResource(
      ResourceType.PROJECT,
      this.id
    );
    await resourceService.createOrUpdateCorrespondingFolder(
      resource,
      this.name,
      this.isArchived
    );
  }

  @BeforeRemove()
  async deleteResource() {
    const resourceService = new ResourceSyncService();
    await resourceService.deleteResource(ResourceType.PROJECT, this.id);
  }
}
