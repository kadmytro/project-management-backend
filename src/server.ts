import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { AppDataSource } from "./data-source";
import seedSuperUser from "./script/seedSuperUser";
import fs from "fs";
import path from "path";
import cookieParser from "cookie-parser";
import seedTaskStatus from "./script/seedTaskStatus";

const port = process.env.BACKEND_PORT || 4000;

AppDataSource.initialize()
  .then(async (ds) => {
    try {
      const migrations = await ds.runMigrations();
      console.log(
        "Applied Migrations:",
        migrations.map((migration) => migration.name)
      );
    } catch (err) {
      console.error("Error during Data Source initialization:", err);
    }
  })
  .then(async () => {
    const app = express();
    app.use(bodyParser.json());

    app.use(
      cors({
        origin: process.env.FRONTEND_URL,
        credentials: true,
      })
    );
    await seedSuperUser();
    await seedTaskStatus();
    app.use(cookieParser());

    // register express routes from defined application routes
    const routesPath = path.join(__dirname, "route");
    fs.readdirSync(routesPath).forEach((file) => {
      const routePath = path.join(routesPath, file);
      const route = require(routePath).default;
      app.use(route);
      console.log(`Loaded route from: ${routePath}`);
    });

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch((error) => console.log(error));
