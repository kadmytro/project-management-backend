import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entity/User";
import { Position } from "./entity/Position";
import { Project } from "./entity/Project";
import { ProjectPhase } from "./entity/ProjectPhase";
import { ProjectRole } from "./entity/ProjectRole";
import { ProjectTemplate } from "./entity/ProjectTemplate";
import { RecurrenceFrequency } from "./entity/RecurrenceFrequency";
import { Resource } from "./entity/Resource";
import { Subtask } from "./entity/Subtask";
import { Task } from "./entity/Task";
import { TaskStatus } from "./entity/TaskStatus";
import { TemplateProjectPhase } from "./entity/TemplateProjectPhase";
import { TemplateProjectRole } from "./entity/TemplateProjectRole";
import { TemplateTask } from "./entity/TemplateTask";
import { FileItem } from "./entity/FileItem";
import { UserGroup } from "./entity/UserGroup";
import dotenv from "dotenv"; // Import dotenv
import { LocalPermission } from "./entity/LocalPermission";
import { GlobalPermission } from "./entity/GlobalPermission";
import { TaskCompletionFile } from "./entity/TaskCompletionFile";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432", 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  synchronize: false,
  logging: false,
  entities: [
    FileItem,
    TaskCompletionFile,
    GlobalPermission,
    LocalPermission,
    Position,
    Project,
    ProjectPhase,
    ProjectRole,
    ProjectTemplate,
    RecurrenceFrequency,
    Resource,
    Subtask,
    Task,
    TaskStatus,
    TemplateProjectPhase,
    TemplateProjectRole,
    TemplateTask,
    User,
    UserGroup,
  ],
  migrations: ["src/migration/**/*.ts"],
  subscribers: [],
  connectTimeoutMS: 10000,
});
