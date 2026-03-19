import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { config } from "../config.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { logAudit } from "../services/audit.service.js";

const router = Router();
const MAX_RESPONSIVA_BYTES = 5 * 1024 * 1024;

const itemSchema = z.object({
  assetName: z.string().min(1),
  assetCategory: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  operatingSystem: z.string().optional().nullable(),
  processor: z.string().optional().nullable(),
  ram: z.string().optional().nullable(),
  storage: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  assignedUserId: z.string().optional().nullable(),
  owningTeamId: z.string().optional().nullable(),
});
const addCommentSchema = z.object({
  authorId: z.string().optional().nullable(),
  authorName: z.string().min(1),
  text: z.string().min(1),
});

const responsivaSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().default("application/pdf"),
  sizeBytes: z.number().int().positive(),
  base64: z.string().min(1),
});

async function ensureUploadDir() {
  const dir = path.resolve(config.uploadDir, "responsivas");
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const rows = await prisma.inventoryItem.findMany({
      include: {
        assignedUser: true,
        owningTeam: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(rows);
  })
);

router.post(
  "/",
  requireRole("support"),
  asyncHandler(async (req, res) => {
    const payload = itemSchema.parse(req.body);
    const item = await prisma.inventoryItem.create({ data: payload });

    await logAudit({
      actorId: req.user.id,
      actorName: req.user.name,
      action: "create",
      entityType: "inventory",
      entityId: item.id,
      summary: `Inventory item created: ${item.assetName}`,
      details: item.serialNumber || "",
    });

    return res.status(201).json(item);
  })
);

router.put(
  "/:id",
  requireRole("support"),
  asyncHandler(async (req, res) => {
    const payload = itemSchema.partial().parse(req.body);
    const item = await prisma.inventoryItem.update({
      where: { id: req.params.id },
      data: payload,
    });

    await logAudit({
      actorId: req.user.id,
      actorName: req.user.name,
      action: "update",
      entityType: "inventory",
      entityId: item.id,
      summary: `Inventory item updated: ${item.assetName}`,
    });

    return res.json(item);
  })
);

router.post(
  "/:id/comments",
  requireRole("support"),
  asyncHandler(async (req, res) => {
    const payload = addCommentSchema.parse(req.body);
    const item = await prisma.inventoryItem.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ message: "Inventory item not found" });

    const currentComments = Array.isArray(item.commentsJson) ? item.commentsJson : [];
    const nextComment = {
      id: crypto.randomUUID(),
      authorId: payload.authorId || req.user.id,
      authorName: payload.authorName,
      text: payload.text,
      createdAt: new Date().toISOString(),
    };

    const updated = await prisma.inventoryItem.update({
      where: { id: item.id },
      data: {
        commentsJson: [...currentComments, nextComment],
      },
    });

    await logAudit({
      actorId: req.user.id,
      actorName: req.user.name,
      action: "maintenance",
      entityType: "inventory",
      entityId: item.id,
      summary: `Maintenance added: ${item.assetName}`,
      details: payload.text,
    });

    return res.json(updated);
  })
);

router.put(
  "/:id/responsiva",
  requireRole("support"),
  asyncHandler(async (req, res) => {
    const payload = responsivaSchema.parse(req.body);
    if (payload.sizeBytes > MAX_RESPONSIVA_BYTES) {
      return res.status(400).json({ message: "Responsiva max size is 5MB" });
    }
    if (payload.mimeType !== "application/pdf") {
      return res.status(400).json({ message: "Only PDF files are allowed" });
    }

    const item = await prisma.inventoryItem.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ message: "Inventory item not found" });

    const dir = await ensureUploadDir();
    const safeName = `${item.id}-${Date.now()}.pdf`;
    const fullPath = path.join(dir, safeName);
    const fileBuffer = Buffer.from(payload.base64, "base64");

    if (fileBuffer.length > MAX_RESPONSIVA_BYTES) {
      return res.status(400).json({ message: "Responsiva max size is 5MB" });
    }

    await fs.writeFile(fullPath, fileBuffer);

    const updated = await prisma.inventoryItem.update({
      where: { id: item.id },
      data: {
        responsivaName: payload.fileName,
        responsivaPath: path.join("responsivas", safeName).replaceAll("\\", "/"),
        responsivaMime: payload.mimeType,
        responsivaSize: payload.sizeBytes,
      },
    });

    await logAudit({
      actorId: req.user.id,
      actorName: req.user.name,
      action: "upload",
      entityType: "inventory_responsiva",
      entityId: item.id,
      summary: `Responsiva uploaded: ${item.assetName}`,
      details: payload.fileName,
    });

    return res.json(updated);
  })
);

router.delete(
  "/:id",
  requireRole("support"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.inventoryItem.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Inventory item not found" });

    await prisma.inventoryItem.delete({ where: { id: req.params.id } });

    await logAudit({
      actorId: req.user.id,
      actorName: req.user.name,
      action: "delete",
      entityType: "inventory",
      entityId: existing.id,
      summary: `Inventory item deleted: ${existing.assetName}`,
    });

    return res.status(204).send();
  })
);

export default router;
