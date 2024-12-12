import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  AfterInsert,
  AfterUpdate,
  BeforeRemove,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Project } from "./Project";
import { User } from "./User";
import { ProjectRole } from "./ProjectRole";
import { ProjectPhase } from "./ProjectPhase";
import { Subtask } from "./Subtask";
import { TaskStatus } from "./TaskStatus";
import { RecurrenceFrequency } from "./RecurrenceFrequency";
import { ResourceSyncService } from "../service/resourceSyncService";
import { ResourceType } from "../type/ResourceType";
import { SubmissionType } from "../type/SubmissionType";
import { TaskType } from "../type/TaskType";
import { TaskCompletionFile } from "./TaskCompletionFile";

@Entity({ name: "TaskSet" })
export class Task {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({
    type: "enum",
    enum: SubmissionType,
    default: SubmissionType.SIMPLE_MARK,
  })
  submissionType!: string;

  @Column({ type: "date", nullable: true })
  startDate!: Date | null;

  @Column({ type: "date", nullable: true })
  endDate!: Date | null;

  @Column({ type: "date", nullable: true })
  submissionDate!: Date | null;

  @Column({ type: "enum", enum: TaskType, default: TaskType.SINGLE })
  type!: TaskType;

  @ManyToOne(() => TaskStatus, (taskStatus) => taskStatus.tasks, {
    nullable: true,
  })
  status!: TaskStatus | null;

  @Column({ type: "int", default: 0 })
  ordinal!: number;

  @Column({ default: false })
  isRecurring!: boolean;

  @OneToOne(() => RecurrenceFrequency, (frequency) => frequency.task, {
    nullable: true,
    cascade: true,
    orphanedRowAction: "delete",
  })
  @JoinColumn({ name: "recurrenceFrequencyId" })
  recurrenceFrequency!: RecurrenceFrequency | null;

  @ManyToOne(() => User, { nullable: true })
  assignee!: User | null;

  @ManyToOne(() => ProjectRole, { nullable: true }) //POTENTIALLY USELESS
  assigneeRole!: ProjectRole | null;

  @ManyToOne(() => User, { nullable: true })
  verifier!: User | null;

  @ManyToOne(() => ProjectRole, { nullable: true }) //POTENTIALLY USELESS
  verifierRole!: ProjectRole | null;

  @ManyToOne(() => Project, (project) => project.tasks, { onDelete: "CASCADE" })
  project!: Project;

  @ManyToOne(() => ProjectPhase, (phase) => phase.tasks, {
    nullable: true,
    onDelete: "CASCADE",
  })
  projectPhase!: ProjectPhase | null;

  @OneToMany(() => Subtask, (subtask) => subtask.task, { cascade: true })
  subtasks!: Subtask[];

  @OneToOne(() => TaskCompletionFile, (file) => file.task, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn()
  taskCompletionFile!: TaskCompletionFile | null;

  @CreateDateColumn()
  createdOn!: Date;

  @UpdateDateColumn()
  updatedOn!: Date;

  getDetails() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      submissionType: this.submissionType,
      startDate: this.startDate,
      endDate: this.endDate,
      submissionDate: this.submissionDate,
      status: this.status?.key,
      ordinal: this.ordinal,
      isReccuring: this.isRecurring,
      recurrenceFrequency: this.recurrenceFrequency?.getDetails(),
      assigneeId: this.assignee?.id,
      verifierId: this.verifier?.id,
      projectId: this.project?.id,
      projectPhaseId: this.projectPhase?.id,
      subtaskIds: this.subtasks?.map((s) => s.id),
      createdOn: this.createdOn,
      updatedOn: this.updatedOn,
      taskCompletionFile: this.taskCompletionFile?.getDetails(),
    };
  }

  @AfterInsert()
  @AfterUpdate()
  async createResource() {
    const resourceService = new ResourceSyncService();

    const parentResourceId = this.projectPhase
      ? (
          await resourceService.findResource(
            ResourceType.PROJECT_PHASE,
            this.projectPhase?.id
          )
        )?.id
      : (
          await resourceService.findResource(
            ResourceType.PROJECT,
            this.project?.id
          )
        )?.id;

    if (parentResourceId) {
      const resource = await resourceService.createOrUpdateResource(
        ResourceType.TASK,
        this.id,
        parentResourceId
      );
      await resourceService.createOrUpdateCorrespondingFolder(
        resource,
        this.title
      );
    }
  }

  @BeforeRemove()
  async deleteResource() {
    const resourceService = new ResourceSyncService();
    await resourceService.deleteResource(ResourceType.TASK, this.id);
  }
}
