import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";

const SECRET_KEY = process.env.JWT_SECRET || "your-secret-key";

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.cookies.token;
  if (!token) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const decoded: any = jwt.verify(token, SECRET_KEY);
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: decoded.userId },
      relations: [
        "groups",
        "position",
        "managingProjects",
        "participatingInProjects",
        "projectRoles",
      ],
    });

    if (!user) {
      res.status(401).json({ message: "Invalid token" });
      return;
    }

    req.user = user.getDetails();
    next();
  } catch (error) {
    res.status(500).json({ message: "Something went wrong", error });
  }
};
