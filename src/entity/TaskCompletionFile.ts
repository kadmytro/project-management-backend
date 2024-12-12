import {
  BeforeInsert,
  BeforeRemove,
  BeforeUpdate,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { FileItem } from "./FileItem";
import { Task } from "./Task";
import { Subtask } from "./Subtask";

@Entity({ name: "TaskCompletionFileSet" })
export class TaskCompletionFile {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => FileItem, { onDelete: "CASCADE" })
  @JoinColumn()
  fileItem!: FileItem; // Metadata for the uploaded file.

  @OneToOne(() => Task, (task) => task.taskCompletionFile, {
    nullable: true,
  })
  @JoinColumn()
  task!: Task | null; // If the file is for a task.

  @OneToOne(() => Subtask, (subtask) => subtask.taskCompletionFile, {
    nullable: true,
  })
  @JoinColumn()
  subtask!: Subtask | null; // If the file is for a subtask.

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  getDetails() {
    return {
      id: this.id,
      fileItem: this.fileItem?.getDetails(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  @BeforeInsert()
  @BeforeUpdate()
  validateIds() {
    if (!this.task && !this.subtask) {
      throw new Error("Either task or subtask must be set.");
    }
    if (this.task && this.subtask) {
      throw new Error("Only one of task or subtask can be set.");
    }
  }
}
