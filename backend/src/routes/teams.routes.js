import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { logAudit } from "../services/audit.service.js";

const router = Router();

const teamSchema = z.object({
  name: z.string().min(2),
  memberIds: z.array(z.string()).default([]),
  supervisorIds: z.array(z.string()).default([]),
});

function normalizeTeamPayload(payload) {
  const supervisors = Array.from(new Set(payload.supervisorIds || []));
  const members = Array.from(new Set([...(payload.memberIds || []), ...supervisors]));
  return { name: payload.name.trim(), members, supervisors };
}

async function assertTeamAssignmentsAllowed(teamId, memberIds, supervisorIds) {
  const users = await prisma.user.findMany({
    where: { id: { in: memberIds } },
    include: { assignment: true },
  });

  const userById = new Map(users.map((user) => [user.id, user]));
  for (const userId of memberIds) {
    const user = userById.get(userId);
    if (!user) {
      const error = new Error(`User not found: ${userId}`);
      error.statusCode = 400;
      throw error;
    }
    if (user.role === "SUPPORT") {
      const error = new Error("Support users cannot belong to teams");
      error.statusCode = 400;
      throw error;
    }
    if (user.assignment && user.assignment.teamId !== teamId) {
      const error = new Error("A user already belongs to another team");
      error.statusCode = 400;
      throw error;
    }
  }

  for (const supervisorId of supervisorIds) {
    const user = userById.get(supervisorId);
    if (!user || user.role !== "SUPERVISOR") {
      const error = new Error("Only supervisors can be selected as supervisors");
      error.statusCode = 400;
      throw error;
    }
  }
}

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const teams = await prisma.team.findMany({
      include: {
        assignments: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = teams.map((team) => ({
      id: team.id,
      name: team.name,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
      memberIds: team.assignments.map((assignment) => assignment.userId),
      supervisorIds: team.assignments
        .filter((assignment) => assignment.isSupervisor)
        .map((assignment) => assignment.userId),
      members: team.assignments.map((assignment) => ({
        id: assignment.user.id,
        name: assignment.user.name,
        email: assignment.user.email,
        role: String(assignment.user.role).toLowerCase(),
        isSupervisor: assignment.isSupervisor,
      })),
    }));

    return res.json(data);
  })
);

router.post(
  "/",
  requireRole("support"),
  asyncHandler(async (req, res) => {
    const payload = normalizeTeamPayload(teamSchema.parse(req.body));
    await assertTeamAssignmentsAllowed(null, payload.members, payload.supervisors);

    const team = await prisma.team.create({
      data: {
        name: payload.name,
        assignments: {
          create: payload.members.map((userId) => ({
            userId,
            isSupervisor: payload.supervisors.includes(userId),
          })),
        },
      },
      include: {
        assignments: true,
      },
    });

    await logAudit({
      actorId: req.user.id,
      actorName: req.user.name,
      action: "create",
      entityType: "team",
      entityId: team.id,
      summary: `Team created: ${team.name}`,
      details: `Members: ${team.assignments.length}`,
    });

    return res.status(201).json(team);
  })
);

router.put(
  "/:id",
  requireRole("support"),
  asyncHandler(async (req, res) => {
    const teamId = req.params.id;
    const payload = normalizeTeamPayload(teamSchema.parse(req.body));

    const existing = await prisma.team.findUnique({ where: { id: teamId } });
    if (!existing) return res.status(404).json({ message: "Team not found" });

    await assertTeamAssignmentsAllowed(teamId, payload.members, payload.supervisors);

    await prisma.$transaction([
      prisma.team.update({
        where: { id: teamId },
        data: { name: payload.name },
      }),
      prisma.teamAssignment.deleteMany({ where: { teamId } }),
      prisma.teamAssignment.createMany({
        data: payload.members.map((userId) => ({
          teamId,
          userId,
          isSupervisor: payload.supervisors.includes(userId),
        })),
      }),
    ]);

    await logAudit({
      actorId: req.user.id,
      actorName: req.user.name,
      action: "update",
      entityType: "team",
      entityId: teamId,
      summary: `Team updated: ${payload.name}`,
      details: `Members: ${payload.members.length}`,
    });

    return res.json({ ok: true });
  })
);

router.delete(
  "/:id",
  requireRole("support"),
  asyncHandler(async (req, res) => {
    const teamId = req.params.id;
    const existing = await prisma.team.findUnique({ where: { id: teamId } });
    if (!existing) return res.status(404).json({ message: "Team not found" });

    await prisma.team.delete({ where: { id: teamId } });

    await logAudit({
      actorId: req.user.id,
      actorName: req.user.name,
      action: "delete",
      entityType: "team",
      entityId: teamId,
      summary: `Team deleted: ${existing.name}`,
    });

    return res.status(204).send();
  })
);

export default router;

