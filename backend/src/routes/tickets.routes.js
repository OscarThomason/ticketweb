import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { config } from "../config.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { logAudit } from "../services/audit.service.js";

const router = Router();
const MAX_TICKET_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_TICKET_ATTACHMENT_TYPES = new Set(["image/png", "image/jpeg", "image/jpg"]);

const ticketAttachmentSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  base64: z.string().min(1),
});

const createTicketSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(3),
  category: z.string().min(1),
  priority: z.string().min(1),
  activity: z.string().min(1),
  attachments: z.array(ticketAttachmentSchema).max(1).optional(),
});

const updateTicketSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(3).optional(),
  category: z.string().optional(),
  priority: z.string().optional(),
  activity: z.string().optional(),
  status: z.string().optional(),
  attachments: z.array(z.union([z.string(), z.record(z.any())])).optional(),
});

const addCommentSchema = z.object({
  text: z.string().min(1),
});

const updateStatusSchema = z.object({
  status: z.string().min(1),
  note: z.string().optional(),
});

const rateSupportSchema = z.object({
  rating: z.number().int().min(1).max(5),
});

function generateTicketCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let index = 0; index < 5; index += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `TK-${suffix}`;
}

async function createUniqueTicketCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateTicketCode();
    const existing = await prisma.ticket.findUnique({ where: { code } });
    if (!existing) return code;
  }

  const fallback = `TK-${Date.now().toString(36).slice(-5).toUpperCase()}`;
  return fallback;
}

async function ensureTicketUploadDir() {
  const dir = path.resolve(config.uploadDir, "tickets");
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

async function saveTicketAttachments(ticketId, attachments = []) {
  if (!Array.isArray(attachments) || attachments.length === 0) return [];

  const dir = await ensureTicketUploadDir();
  const savedAttachments = [];

  for (const attachment of attachments.slice(0, 1)) {
    if (attachment.sizeBytes > MAX_TICKET_ATTACHMENT_BYTES) {
      throw new Error("Ticket attachment max size is 5MB");
    }

    if (!ALLOWED_TICKET_ATTACHMENT_TYPES.has(attachment.mimeType)) {
      throw new Error("Only PNG and JPG images are allowed");
    }

    const extension = path.extname(attachment.fileName || "").toLowerCase() || ".jpg";
    const safeName = `${ticketId}-${crypto.randomUUID()}${extension}`;
    const fileBuffer = Buffer.from(attachment.base64, "base64");

    if (fileBuffer.length > MAX_TICKET_ATTACHMENT_BYTES) {
      throw new Error("Ticket attachment max size is 5MB");
    }

    const fullPath = path.join(dir, safeName);
    await fs.writeFile(fullPath, fileBuffer);

    savedAttachments.push({
      id: crypto.randomUUID(),
      name: attachment.fileName,
      size: attachment.sizeBytes,
      type: attachment.mimeType,
      path: path.join("tickets", safeName).replaceAll("\\", "/"),
      uploadedAt: new Date().toISOString(),
    });
  }

  return savedAttachments;
}

const ticketInclude = {
  createdBy: {
    select: {
      id: true,
      name: true,
    },
  },
  comments: {
    include: {
      author: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  statusHistory: true,
};

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
      include: ticketInclude,
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

    let savedAttachments = [];
    try {
      savedAttachments = await saveTicketAttachments(req.user.id, payload.attachments || []);
    } catch (error) {
      return res.status(400).json({ message: error.message || "Invalid ticket attachment" });
    }

    const created = await prisma.ticket.create({
      data: {
        ...payload,
        code: await createUniqueTicketCode(),
        createdById: req.user.id,
        teamId: assignment?.teamId || null,
        attachments: savedAttachments,
        status: "Abierto",
        statusHistory: {
          create: {
            status: "Abierto",
            changedById: req.user.id,
            note: "Ticket creado",
          },
        },
      },
      include: ticketInclude,
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
      include: ticketInclude,
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
      include: ticketInclude,
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
        closedBySupportId:
          payload.status === "Cerrado" && req.user.role === "support"
            ? req.user.id
            : payload.status === "Cerrado"
              ? ticket.closedBySupportId
              : null,
        statusHistory: {
          create: {
            status: payload.status,
            changedById: req.user.id,
            note: payload.note || "",
          },
        },
      },
      include: ticketInclude,
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

router.post(
  "/:id/rating",
  asyncHandler(async (req, res) => {
    const payload = rateSupportSchema.parse(req.body);

    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: {
        statusHistory: {
          orderBy: { changedAt: "asc" },
        },
      },
    });

    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    if (req.user.role !== "user") return res.status(403).json({ message: "Only users can rate support" });
    if (ticket.createdById !== req.user.id) return res.status(403).json({ message: "You can only rate your own tickets" });
    if (ticket.status !== "Cerrado") return res.status(400).json({ message: "Only closed tickets can be rated" });

    const closerId = ticket.closedBySupportId
      || [...ticket.statusHistory].reverse().find((entry) => entry.status === "Cerrado")?.changedById
      || null;

    const closer = closerId
      ? await prisma.user.findUnique({
          where: { id: closerId },
          select: { id: true, role: true, name: true },
        })
      : null;
    const supportCloserId = closer?.role === "SUPPORT" ? closer.id : ticket.closedBySupportId || null;

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        supportRating: payload.rating,
        supportRatedAt: new Date(),
        closedBySupportId: supportCloserId,
      },
      include: ticketInclude,
    });

    await logAudit({
      actorId: req.user.id,
      actorName: req.user.name,
      action: "rate_support",
      entityType: "ticket",
      entityId: ticket.id,
      summary: `Support rated: ${payload.rating} stars`,
      details: closer?.name || "",
    });

    return res.json(updated);
  })
);

export default router;
