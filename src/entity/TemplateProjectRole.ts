import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { ProjectTemplate } from "./ProjectTemplate";
import { TemplateTask } from "./TemplateTask";

@Entity({ name: "TemplateProjectRoleSet" })
export class TemplateProjectRole {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string; // e.g., "Coordinator", "Mentor", "Participant"

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ default: false })
  isManagingTeam!: boolean;

  @ManyToOne(() => ProjectTemplate, (template) => template.projectRoles, {
    onDelete: "CASCADE",
  })
  project!: ProjectTemplate;

  @OneToMany(() => TemplateTask, (task) => task.assigneeRole)
  assignedTasks!: TemplateTask[];

  @OneToMany(() => TemplateTask, (task) => task.verifierRole)
  verifyingTasks!: TemplateTask[];

  getDetails() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      projectId: this.project?.id,
      IsManagintTeam: this.isManagingTeam,
      assignedTaskIds: this.assignedTasks?.map((t) => t.id),
      verifyingTaskIds: this.verifyingTasks?.map((t) => t.id),
    };
  }
}
