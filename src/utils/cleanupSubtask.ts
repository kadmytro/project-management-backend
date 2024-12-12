import { IsNull } from "typeorm";
import { AppDataSource } from "../data-source";
import { Subtask } from "../entity/Subtask";

export async function cleanupSubtask() {
  const subtaskRepository = AppDataSource.getRepository(Subtask);
  const subtasksToRemove = await subtaskRepository.find({
    where: { task: IsNull() },
  });

  await subtaskRepository.remove(subtasksToRemove);
}
