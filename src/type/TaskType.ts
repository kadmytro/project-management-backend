export enum TaskType {
  SINGLE = "single", // A one-time task, assigned to one person.
  BY_PARTICIPANT = "by_participant", // Each participant must perform the task (subtasks are created and assigned to each participant).
  PER_PARTICIPANT = "per_participant", // The assignee performs the task for each participant (subtasks are created for each participant, but assigned to the assignee).
}

export const isValidTaskType = (type: string): boolean => {
  return Object.values(TaskType).includes(type as TaskType);
}
