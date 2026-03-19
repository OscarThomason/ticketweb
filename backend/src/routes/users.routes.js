import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../lib/password.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { normalizeRole, serializeUser } from "../utils/serializers.js";
import { logAudit } from "../services/audit.service.js";

const router = Router();

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.string().optional(),
  avatar: z.string().optional().nullable(),
  teamId: z.string().optional().nullable(),
  equipmentId: z.string().optional().nullable(),
  isSupervisor: z.boolean().optional(),
});

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.string().optional(),
  avatar: z.string().optional().nullable(),
  teamId: z.string().optional().nullable(),
  equipmentId: z.string().optional().nullable(),
  isSupervisor: z.boolean().optional(),
});

router.use(requireAuth);

router.get(
  "/",
  requireRole("support"),
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      include: { assignment: { include: { team: true } } },
      orderBy: { createdAt: "desc" },
    });
    return res.json(users.map(serializeUser));
  })
);

router.post(
  "/",
  requireRole("support"),
  asyncHandler(async (req, res) => {
    const input = createSchema.parse(req.body);
    const role = normalizeRole(input.role);

    const user = await prisma.user.create({
      data: {
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        passwordHash: await hashPassword(input.password),
        role,
        avatar: input.avatar || null,
      },
    });

    if (input.teamId && role !== "SUPPORT") {
      await prisma.teamAssignment.create({
        data: {
          teamId: input.teamId,
          userId: user.id,
          isSupervisor: Boolean(input.isSupervisor) && role === "SUPERVISOR",
        },
      });
    }

    if (input.equipmentId) {
      await prisma.inventoryItem.update({
        where: { id: input.equipmentId },
        data: { assignedUserId: user.id },
      });
    }

    const created = await prisma.user.findUnique({
      where: { id: user.id },
      include: { assignment: { include: { team: true } } },
    });

    await logAudit({
      actorId: req.user.id,
      actorName: req.user.name,
      action: "create",
      entityType: "user",
      entityId: user.id,
      summary: `User created: ${user.name}`,
      details: user.email,
    });

    return res.status(201).json(serializeUser(created));
  })
);

router.put(
  "/:id",
  requireRole("support"),
  asyncHandler(async (req, res) => {
    const input = updateSchema.parse(req.body);
    const userId = req.params.id;
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      include: { assignment: true },
    });
    if (!existing) return res.status(404).json({ message: "User not found" });

    const role = input.role ? normalizeRole(input.role) : existing.role;
    const updateData = {};
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.email !== undefined) updateData.email = input.email.trim().toLowerCase();
    if (input.avatar !== undefined) updateData.avatar = input.avatar || null;
    if (input.password) updateData.passwordHash = await hashPassword(input.password);
    if (input.role !== undefined) updateData.role = role;

    await prisma.user.update({ where: { id: userId }, data: updateData });

    if (input.teamId !== undefined) {
      if (role === "SUPPORT") {
        await prisma.teamAssignment.deleteMany({ where: { userId } });
      } else if (!input.teamId) {
        await prisma.teamAssignment.deleteMany({ where: { userId } });
      } else {
        await prisma.teamAssignment.upsert({
          where: { userId },
          update: {
            teamId: input.teamId,
            isSupervisor: Boolean(input.isSupervisor) && role === "SUPERVISOR",
          },
          create: {
            userId,
            teamId: input.teamId,
            isSupervisor: Boolean(input.isSupervisor) && role === "SUPERVISOR",
          },
        });
      }
    }

    if (input.equipmentId !== undefined) {
      await prisma.inventoryItem.updateMany({
        where: { assignedUserId: userId },
        data: { assignedUserId: null },
      });
      if (input.equipmentId) {
        await prisma.inventoryItem.update({
          where: { id: input.equipmentId },
          data: { assignedUserId: userId },
        });
      }
    }

    const updated = await prisma.user.findUnique({
      where: { id: userId },
      include: { assignment: { include: { team: true } } },
    });

    await logAudit({
      actorId: req.user.id,
      actorName: req.user.name,
      action: "update",
      entityType: "user",
      entityId: userId,
      summary: `User updated: ${updated.name}`,
      details: updated.email,
    });

    return res.json(serializeUser(updated));
  })
);

router.delete(
  "/:id",
  requireRole("support"),
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) return res.status(404).json({ message: "User not found" });

    await prisma.inventoryItem.updateMany({
      where: { assignedUserId: userId },
      data: { assignedUserId: null },
    });

    await prisma.teamAssignment.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });

    await logAudit({
      actorId: req.user.id,
      actorName: req.user.name,
      action: "delete",
      entityType: "user",
      entityId: userId,
      summary: `User deleted: ${existing.name}`,
      details: existing.email,
    });

    return res.status(204).send();
  })
);

export default router;

