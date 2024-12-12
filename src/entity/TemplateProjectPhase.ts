import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { ProjectTemplate } from "./ProjectTemplate";
import { TemplateTask } from "./TemplateTask";

@Entity({ name: "TemplateProjectPhaseSet" })
export class TemplateProjectPhase {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string; // e.g., "Phase 1", "Preparation Phase"

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @ManyToOne(() => ProjectTemplate, (project) => project.phases, {
    onDelete: "CASCADE",
  })
  project!: ProjectTemplate;

  @OneToMany(() => TemplateTask, (task) => task.projectPhase, { cascade: true })
  tasks!: TemplateTask[];

  @Column({ type: "int", default: 0 })
  ordinal!: number;

  getDetails() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      projectId: this.project?.id,
      taskIds: this.tasks?.map((t) => t.id),
      ordinal: this.ordinal,
    };
  }
}
