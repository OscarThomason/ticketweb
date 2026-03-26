import { createApp } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./lib/prisma.js";

const app = await createApp();

app.listen(config.port, () => {
  console.log(`Backend running on http://localhost:${config.port}`);
  if (config.corsAllowedOrigins.length) {
    console.log(`CORS restricted to: ${config.corsAllowedOrigins.join(", ")}`);
  } else {
    console.log("CORS: allow-all (set CORS_ALLOWED_ORIGINS in production)");
  }
});

const shutdown = async () => {
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
