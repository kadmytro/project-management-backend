import { addDays, addWeeks, addMonths, addYears } from "date-fns";
import { Project } from "../entity/Project";
import { Subtask } from "../entity/Subtask";
import { Task } from "../entity/Task";
import {
  isValidRecurrenceUnit,
  RecurrenceType,
  RecurrenceUnit,
} from "../type/RecurrenceUnits";
import { AppDataSource } from "../data-source";
import { TaskType } from "../type/TaskType";

interface TaskRecurrenceDetails {
  startDate: Date;
  endDate: Date;
  title: string;
  description: string;
}

const generateRecurringSubtasksDetails = (
  task: Task
): TaskRecurrenceDetails[] => {
  const details: TaskRecurrenceDetails[] = [];
  if (!task.startDate || !task.endDate) {
    throw new Error("Task start and end date are required");
  }

  const startDate = new Date(task.startDate);
  const endDate = new Date(task.endDate);
  if (!task.isRecurring || !task.recurrenceFrequency) {
    details.push({
      startDate: startDate,
      endDate: endDate,
      title: task.title,
      description: task.description ?? task.title,
    });
    return details;
  }
  const frequency = task.recurrenceFrequency;
  let current = startDate;
  let nextDate = current;

  switch (frequency.type) {
    case RecurrenceType.INTERVAL:
      let occurence = 1;
      if (!frequency.intervalValue || !frequency.intervalUnit) break;

      if (!isValidRecurrenceUnit(frequency.intervalUnit)) {
        throw new Error("Invalid recurrence unit");
      }

      while (current < endDate) {
        nextDate =
          frequency.intervalUnit === RecurrenceUnit.DAYS
            ? addDays(current, frequency.intervalValue)
            : frequency.intervalUnit === RecurrenceUnit.WEEKS
            ? addWeeks(current, frequency.intervalValue)
            : frequency.intervalUnit === RecurrenceUnit.MONTHS
            ? addMonths(current, frequency.intervalValue)
            : frequency.intervalUnit === RecurrenceUnit.YEARS
            ? addYears(current, frequency.intervalValue)
            : current;
        nextDate = nextDate > endDate ? endDate : nextDate;
        details.push({
          startDate: new Date(current),
          endDate: new Date(nextDate),
          title: `${task.title} (${occurence})`,
          description:
            task.description ?? `${occurence} occurence of ${task.title}`,
        });
        occurence++;
        current = nextDate;
      }
      break;

    case RecurrenceType.WEEKLY:
      if (!frequency.daysOfWeek || !Array.isArray(frequency.daysOfWeek)) {
        throw new Error("Days of week are required");
      }

      const getNextDate = (current: Date, maxDate: Date): Date => {
        let nextDate = addDays(current, 1);
        while (
          nextDate < maxDate &&
          !frequency.daysOfWeek?.includes(nextDate.getDay())
        ) {
          nextDate = addDays(nextDate, 1);
        }
        return nextDate;
      };

      while (current < endDate) {
        nextDate = getNextDate(current, endDate);
        if (frequency.daysOfWeek.includes(current.getDay())) {
          details.push({
            startDate: new Date(current),
            endDate: new Date(nextDate),
            title: `${task.title} (${getWeekDayName(current.getDay())})`,
            description:
              task.description ?? `Weekly occurence of ${task.title}`,
          });
        }
        current = nextDate;
      }
      break;

    case RecurrenceType.MONTHLY:
      if (!frequency.dayOfMonth) break;

      while (current < endDate) {
        const targetDate = new Date(
          current.getFullYear(),
          current.getMonth(),
          frequency.dayOfMonth
        );
        nextDate =
          current.getDate() < frequency.dayOfMonth
            ? targetDate
            : addMonths(targetDate, 1);
        nextDate = nextDate > endDate ? endDate : nextDate;

        details.push({
          startDate: new Date(current),
          endDate: new Date(nextDate),
          title: `${task.title} (${getMonthName(current.getMonth())})`,
          description: task.description ?? `Monthly occurence of ${task.title}`,
        });

        current = nextDate;
      }
      break;

    default:
      break;
  }
  return details;
};

export const generateSubtasksForTask = async (task: Task): Promise<void> => {
  if (
    !task.startDate ||
    !task.endDate ||
    (task.isRecurring && !task.recurrenceFrequency)
  ) {
    throw new Error(
      "Task start and end date are required. If task is recurring, frequency is also required"
    );
  }
  let generatedSubtasks: Subtask[] = [];
  const subtaskRepository = AppDataSource.getRepository(Subtask);

  if (
    task.type === TaskType.BY_PARTICIPANT ||
    task.type === TaskType.PER_PARTICIPANT
  ) {
    const subtasksDetails = generateRecurringSubtasksDetails(task);
    const project = await AppDataSource.getRepository(Project).findOne({
      where: { id: task.project.id },
      relations: ["participantsTeam"],
    });
    const participants = project?.participantsTeam ?? [];

    generatedSubtasks = subtasksDetails
      .map((details, index) => {
        return participants.map((participant, participantIndex) =>
          subtaskRepository.create({
            title: `${participant.getShortDisplayName()} ${details.title}`,
            description: `Task for ${participant.username}. ${details.description}`,
            startDate: details.startDate,
            endDate: details.endDate,
            assignee:
              task.type === TaskType.BY_PARTICIPANT
                ? participant
                : task.assignee,
            forParticipant: participant.id,
            ordinal: index * participants.length + participantIndex + 1,
            autoGenerated: true,
            submissionType: task.submissionType,
            task: task,
          })
        );
      })
      .flat();
  } else if (task.isRecurring) {
    const subtasksDetails = generateRecurringSubtasksDetails(task);
    generatedSubtasks = subtasksDetails.map((details, index) => {
      const newSubtask = subtaskRepository.create({
        title: details.title,
        description: details.description,
        startDate: details.startDate,
        endDate: details.endDate,
        ordinal: index + 1,
        assignee: task.assignee,
        autoGenerated: true,
        submissionType: task.submissionType,
        task: task,
      });
      return newSubtask;
    });
  }

  if (generatedSubtasks.length) {
    await subtaskRepository.save(generatedSubtasks);
    task.subtasks = [...(task.subtasks ?? []), ...generatedSubtasks];
  }
};

const getWeekDayName = (dayIndex: number, locale: string = "en-US"): string => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - date.getUTCDay() + dayIndex);

  return new Intl.DateTimeFormat(locale, { weekday: "long" }).format(date);
};

const getMonthName = (monthIndex: number, locale: string = "en-US"): string => {
  const date = new Date();
  date.setUTCMonth(monthIndex);

  return new Intl.DateTimeFormat(locale, { month: "long" }).format(date);
};
