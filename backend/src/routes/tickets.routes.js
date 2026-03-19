import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { logAudit } from "../services/audit.service.js";

const router = Router();

const createTicketSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(3),
  category: z.string().min(1),
  priority: z.string().min(1),
  activity: z.string().min(1),
  attachments: z.array(z.string()).optional(),
});

const updateTicketSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(3).optional(),
  category: z.string().optional(),
  priority: z.string().optional(),
  activity: z.string().optional(),
  status: z.string().optional(),
  attachments: z.array(z.string()).optional(),
});

const addCommentSchema = z.object({
  text: z.string().min(1),
});

const updateStatusSchema = z.object({
  status: z.string().min(1),
  note: z.string().optional(),
});

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const where = {};

    if (req.query.userId) where.createdById = String(req.query.userId);
    if (req.query.teamId) where.teamId = String(req.query.teamId);
    if (req.query.status) where.status = String(req.query.status);
    if (req.query.priority) where.priority = String(req.query.priority);

    if (req.user.role === "user") {
      where.createdById = req.user.id;
    }
    if (req.user.role === "supervisor") {
      where.teamId = req.user.teamId || "__none__";
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        comments: true,
        statusHistory: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(tickets);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const payload = createTicketSchema.parse(req.body);

    const assignment = await prisma.teamAssignment.findUnique({
      where: { userId: req.user.id },
    });

    const created = await prisma.ticket.create({
      data: {
        ...payload,
        createdById: req.user.id,
        teamId: assignment?.teamId || null,
        attachments: payload.attachments || [],
        status: "Abierto",
        statusHistory: {
          create: {
            status: "Abierto",
            changedById: req.user.id,
            note: "Ticket creado",
          },
        },
      },
      include: {
        comments: true,
        statusHistory: true,
      },
    });

    await logAudit({
      actorId: req.user.id,
      actorName: req.user.name,
      action: "create",
      entityType: "ticket",
      entityId: created.id,
      summary: `Ticket created: ${created.title}`,
      details: created.priority,
    });

    return res.status(201).json(created);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: {
        comments: true,
        statusHistory: true,
      },
    });
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    return res.json(ticket);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const updates = updateTicketSchema.parse(req.body);
    const existing = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Ticket not found" });

    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: updates,
    });

    await logAudit({
      actorId: req.user.id,
      actorName: req.user.name,
      action: "update",
      entityType: "ticket",
      entityId: ticket.id,
      summary: `Ticket updated: ${ticket.title}`,
    });

    return res.json(ticket);
  })
);

router.post(
  "/:id/comments",
  asyncHandler(async (req, res) => {
    const payload = addCommentSchema.parse(req.body);
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    const comment = await prisma.ticketComment.create({
      data: {
        ticketId: ticket.id,
        authorId: req.user.id,
        authorRole: req.user.role,
        text: payload.text,
      },
    });

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { updatedAt: new Date() },
    });

    return res.status(201).json(comment);
  })
);

router.post(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const payload = updateStatusSchema.parse(req.body);
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: payload.status,
        statusHistory: {
          create: {
            status: payload.status,
            changedById: req.user.id,
            note: payload.note || "",
          },
        },
      },
      include: {
        statusHistory: true,
      },
    });

    await logAudit({
      actorId: req.user.id,
      actorName: req.user.name,
      action: "status_change",
      entityType: "ticket",
      entityId: ticket.id,
      summary: `Ticket status: ${payload.status}`,
      details: payload.note || "",
    });

    return res.json(updated);
  })
);

export default router;

