import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from "typeorm";
import { ProjectTemplate } from "./ProjectTemplate";
import { TemplateProjectRole } from "./TemplateProjectRole";
import { TemplateProjectPhase } from "./TemplateProjectPhase";
import { RecurrenceFrequency } from "./RecurrenceFrequency";
import { SubmissionType } from "../type/SubmissionType";
import { TaskType } from "../type/TaskType";

@Entity({ name: "TemplateTaskSet" })
export class TemplateTask {
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

  @Column({ type: "enum", enum: TaskType, default: TaskType.SINGLE })
  type!: TaskType;

  @Column({ default: false })
  isRecurring!: boolean;

  @OneToOne(() => RecurrenceFrequency, (frequency) => frequency.task, {
    nullable: true,
    cascade: true,
    orphanedRowAction: "delete",
  })
  @JoinColumn({ name: "recurrenceFrequencyId" })
  recurrenceFrequency!: RecurrenceFrequency | null;

  @ManyToOne(() => ProjectTemplate, (template) => template.tasks, {
    onDelete: "CASCADE",
  })
  project!: ProjectTemplate;

  @ManyToOne(() => TemplateProjectPhase, (phase) => phase.tasks, {
    nullable: true,
    onDelete: "CASCADE",
  })
  projectPhase!: TemplateProjectPhase | null;

  @ManyToOne(() => TemplateProjectRole, { nullable: true })
  assigneeRole!: TemplateProjectRole | null;

  @ManyToOne(() => TemplateProjectRole, { nullable: true })
  verifierRole!: TemplateProjectRole | null;

  @Column({ type: "int", default: 0 })
  ordinal!: number;

  getDetails() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      submissionType: this.submissionType,
      isReccuring: this.isRecurring,
      recurrenceFrequency: this.recurrenceFrequency,
      assigneeRoleId: this.assigneeRole?.id ?? null,
      verifierRoleId: this.verifierRole?.id ?? null,
      projectId: this.project?.id,
      phaseId: this.projectPhase?.id,
    };
  }
}
