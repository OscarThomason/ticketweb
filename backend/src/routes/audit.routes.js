import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();
const createAuditSchema = z.object({
  actorId: z.string().optional().nullable(),
  actorName: z.string().min(1),
  action: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().optional().nullable(),
  summary: z.string().min(1),
  details: z.string().optional().nullable(),
});

router.use(requireAuth, requireRole("support"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: Number(req.query.limit || 500),
    });
    return res.json(logs);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const payload = createAuditSchema.parse(req.body);
    const created = await prisma.auditLog.create({
      data: {
        actorId: payload.actorId || req.user.id,
        actorName: payload.actorName || req.user.name,
        action: payload.action,
        entityType: payload.entityType,
        entityId: payload.entityId || null,
        summary: payload.summary,
        details: payload.details || "",
      },
    });
    return res.status(201).json(created);
  })
);

export default router;
