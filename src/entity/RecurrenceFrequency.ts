import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from "typeorm";
import { Task } from "./Task";
import { TemplateTask } from "./TemplateTask";
import { RecurrenceType, RecurrenceUnit } from "../type/RecurrenceUnits";

@Entity({ name: "RecurrenceFrequencySet" })
export class RecurrenceFrequency {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ 
    type: "enum",
    enum: RecurrenceType,
  })
  type!: RecurrenceType;

  // Interval recurrence
  @Column({ type: "int", nullable: true })
  intervalValue!: number | null; // e.g., 1, 2, 3

  @Column({ type: "enum", enum: RecurrenceUnit, nullable: true })
  intervalUnit!: RecurrenceUnit | null; // e.g., "days", "weeks"

  // Weekly recurrence
  @Column({ type: "simple-array", nullable: true })
  daysOfWeek!: number[] | null; // [0: Sunday, 1: Monday, ...]

  // Monthly recurrence
  @Column({ type: "int", nullable: true })
  dayOfMonth!: number | null; // e.g., 5 for "5th day of the month"

  @OneToOne(() => Task, (task) => task.recurrenceFrequency, {
    onDelete: "CASCADE",
  })
  @JoinColumn()
  task!: Task;

  @OneToOne(
    () => TemplateTask,
    (templateTask) => templateTask.recurrenceFrequency,
    { onDelete: "CASCADE" }
  )
  @JoinColumn()
  templateTask!: TemplateTask;

  getDetails() {
    return {
      type: this.type,
      intervalValue: this.intervalValue,
      intervalUnit: this.intervalUnit,
      daysOfWeek: this.daysOfWeek,
      dayOfMonth: this.dayOfMonth,
    }
  }
}
