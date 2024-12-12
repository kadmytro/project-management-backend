import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  AfterInsert,
  AfterUpdate,
  BeforeRemove,
  UpdateDateColumn,
  CreateDateColumn,
} from "typeorm";
import { Project } from "./Project";
import { Task } from "./Task";
import { ResourceSyncService } from "../service/resourceSyncService";
import { ResourceType } from "../type/ResourceType";

@Entity({ name: "ProjectPhaseSet" })
export class ProjectPhase {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string; // e.g., "Phase 1", "Preparation Phase"

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "date", nullable: true })
  startDate!: Date | null;

  @Column({ type: "date", nullable: true })
  endDate!: Date | null;

  @ManyToOne(() => Project, (project) => project.phases, {
    onDelete: "CASCADE",
  })
  project!: Project;

  @OneToMany(() => Task, (task) => task.projectPhase, { cascade: true })
  tasks!: Task[];

  @Column({ type: "int", default: 0 })
  ordinal!: number;

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
      taskIds: this.tasks?.map((t) => t.id),
      startDate: this.startDate,
      endDate: this.endDate,
      ordinal: this.ordinal,
      createdOn: this.createdOn,
      updatedOn: this.updatedOn,
    };
  }

  @AfterInsert()
  @AfterUpdate()
  async createResource() {
    const resourceService = new ResourceSyncService();
    if (this.project) {
      const parentResourceId = (
        await resourceService.findResource(
          ResourceType.PROJECT,
          this.project?.id
        )
      )?.id;

      const resource = await resourceService.createOrUpdateResource(
        ResourceType.PROJECT_PHASE,
        this.id,
        parentResourceId
      );
      await resourceService.createOrUpdateCorrespondingFolder(
        resource,
        this.name
      );
    }
  }

  @BeforeRemove()
  async deleteResource() {
    const resourceService = new ResourceSyncService();
    await resourceService.deleteResource(ResourceType.PROJECT_PHASE, this.id);
  }
}
