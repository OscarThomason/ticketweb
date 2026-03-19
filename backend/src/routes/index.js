import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import authRoutes from "./auth.routes.js";
import usersRoutes from "./users.routes.js";
import teamsRoutes from "./teams.routes.js";
import ticketsRoutes from "./tickets.routes.js";
import inventoryRoutes from "./inventory.routes.js";
import auditRoutes from "./audit.routes.js";

const router = Router();

router.get("/health", (req, res) => {
  res.json({ ok: true, service: "ticketflow-backend" });
});

router.get("/health/db", async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: "connected" });
  } catch (error) {
    next(error);
  }
});

router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/teams", teamsRoutes);
router.use("/tickets", ticketsRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/audit", auditRoutes);

export default router;
