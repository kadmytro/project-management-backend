import { AppDataSource } from "../data-source";
import { TaskStatus } from "../entity/TaskStatus";
import { DefaultTaskStatusKey } from "../type/DefaultTaskStatusKey";
import { getErrorDetails } from "../utils/errorFormatter";

const seedTaskStatus = async () => {
  const taskStatusRepository = AppDataSource.getRepository(TaskStatus);

  try {
    const defaultStatuses = [
      {
        name: "Not Set",
        color: "#ffffff",
        key: DefaultTaskStatusKey.NOT_SET,
        isProtected: true,
      },
      {
        name: "In Progress",
        color: "#299BE0",
        key: DefaultTaskStatusKey.IN_PROGRESS,
        isProtected: true,
      },
      {
        name: "Overdue",
        color: "#E05843",
        key: DefaultTaskStatusKey.OVERDUE,
        isProtected: true,
      },
      {
        name: "Verification pending",
        color: "#E0CB28",
        key: DefaultTaskStatusKey.IN_VERIFICATION,
        isProtected: true,
      },
      {
        name: "Done",
        color: "#44E096",
        key: DefaultTaskStatusKey.DONE,
        isProtected: true,
      },
    ];

    console.log("Seeding the default task statuses...");

    for (const status of defaultStatuses) {
      const existingStatus = await taskStatusRepository.findOne({
        where: { key: status.key },
      });

      if (!existingStatus) {
        const newStatus = taskStatusRepository.create(status);
        await taskStatusRepository.save(newStatus);
        console.log(`added "${status.key}" default task status`);
      }
    }
    console.log("all default task statuses in order!");
  } catch (error) {
    console.error(
      "Something went wrong during default task statuses feeding",
      getErrorDetails(error)
    );
  }
};

export default seedTaskStatus;
