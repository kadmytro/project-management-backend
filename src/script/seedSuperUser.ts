import bcrypt from "bcrypt";
import { AppDataSource } from "../data-source";
import { Position } from "../entity/Position";
import { User } from "../entity/User";
import { GlobalPermission } from "../entity/GlobalPermission";
import { GlobalPermissionSubject } from "../type/GlobalPermissionSubject";

const seedSuperUser = async () => {
  const positionRepo = AppDataSource.getRepository(Position);
  const userRepo = AppDataSource.getRepository(User);
  const globalPermissionRepo = AppDataSource.getRepository(GlobalPermission);
  const defaultEmail = process.env.SU_DEFAULT_EMAIL;
  const defaultPassword = process.env.SU_DEFAULT_PASSWORD;

  if (defaultEmail && defaultPassword) {
    try {
      let superUserPosition = await positionRepo.findOne({
        where: { name: "SuperUser" },
      });

      if (!superUserPosition) {
        superUserPosition = positionRepo.create({
          name: "SuperUser",
          isProtected: true,
        });
        await positionRepo.save(superUserPosition);
      }

      let superUser = await userRepo.findOne({
        where: { email: defaultEmail },
      });

      if (!superUser) {
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        superUser = userRepo.create({
          username: "superUser",
          email: defaultEmail,
          password: hashedPassword,
          position: superUserPosition,
          isProtected: true,
        });
        await userRepo.save(superUser);
      }

      let superUserPermissions = await globalPermissionRepo.findOne({
        where: { user: superUser },
      });

      if (!superUserPermissions) {
        const superUserPermissions = globalPermissionRepo.create({
          user: superUser,
          subject: GlobalPermissionSubject.EVERYTHING,
          canCreate: true,
          canEdit: true,
          canDelete: true,
          canRead: true,
        });
        await globalPermissionRepo.save(superUserPermissions);
      }
    } catch (error) {
      console.error("Error during superUser seeding:", error);
    }
  } else {
    throw new Error("Super user default email or password not provided!");
  }
};

export default seedSuperUser;
