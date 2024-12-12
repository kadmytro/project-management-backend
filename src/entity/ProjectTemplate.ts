import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  AfterInsert,
  AfterUpdate,
  BeforeRemove,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { TemplateTask } from "./TemplateTask";
import { TemplateProjectRole } from "./TemplateProjectRole";
import { TemplateProjectPhase } from "./TemplateProjectPhase";
import { ResourceSyncService } from "../service/resourceSyncService";
import { ResourceType } from "../type/ResourceType";

@Entity({ name: "ProjectTemplateSet" })
export class ProjectTemplate {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @OneToMany(() => TemplateProjectPhase, (phase) => phase.project, {
    cascade: true,
  })
  phases!: TemplateProjectPhase[];

  @OneToMany(() => TemplateTask, (task) => task.project, { cascade: true })
  tasks!: TemplateTask[];

  @OneToMany(() => TemplateProjectRole, (role) => role.project, {
    cascade: true,
  })
  projectRoles!: TemplateProjectRole[];

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
      phaseIds: this.phases?.map((p) => p.id),
      taskIds: this.tasks?.map((t) => t.id),
      projectRoleIds: this.projectRoles?.map((r) => r.id),
      createdOn: this.createdOn,
      updatedOn: this.updatedOn,
      isArchived: this.isArchived,
    };
  }

  @AfterInsert()
  @AfterUpdate()
  async createResource() {
    const resourceService = new ResourceSyncService();

    const resource = await resourceService.createOrUpdateResource(
      ResourceType.TEMPLATE,
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
    await resourceService.deleteResource(ResourceType.TEMPLATE, this.id);
  }
}
