import fs from "node:fs/promises";
import path from "node:path";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import apiRouter from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { config } from "./config.js";

export async function createApp() {
  const app = express();

  await fs.mkdir(path.resolve(config.uploadDir, "responsivas"), { recursive: true });

  app.use(cors());
  app.use(express.json({ limit: "6mb" }));
  app.use(morgan(config.env === "production" ? "combined" : "dev"));

  app.use("/uploads", express.static(path.resolve(config.uploadDir)));
  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

