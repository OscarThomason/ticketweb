import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

function parseOrigins(value) {
  return String(value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const corsOriginsFromEnv = [
  ...parseOrigins(process.env.CORS_ALLOWED_ORIGINS),
  ...parseOrigins(process.env.FRONTEND_ORIGIN),
];

const corsAllowedOrigins = Array.from(new Set(corsOriginsFromEnv));

export const config = {
  env: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || "",
  jwtSecret: process.env.JWT_SECRET || "change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  uploadDir: process.env.UPLOAD_DIR || path.resolve(process.cwd(), "uploads"),
  corsAllowedOrigins,
};

if (!config.databaseUrl) {
  throw new Error("DATABASE_URL is required");
}
