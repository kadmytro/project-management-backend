import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { Task } from "./Task";
import { Subtask } from "./Subtask";

@Entity({ name: "TaskStatusSet" })
export class TaskStatus {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  name!: string; // e.g., "pending", "in progress", "done", "overdue"

  @Column()
  color!: string; // a string representing a color in HEX

  @OneToMany(() => Task, (task) => task.status)
  tasks!: Task[];

  @OneToMany(() => Subtask, (subtask) => subtask.status)
  subtasks!: Subtask[];

  @Column({ default: false })
  isProtected!: boolean;
  
  @Column({ type: "text", nullable: true, unique: true })
  key!: string | null;

  getDetails() {
    return {
      id: this.id,
      name: this.name,
      colot: this.color,
      taskIds: this.tasks?.map(t => t.id),
      subtaskIds: this.subtasks?.map (s => s.id),
      key: this.key,
    };
  }
}
