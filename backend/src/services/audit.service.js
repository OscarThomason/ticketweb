import { prisma } from "../lib/prisma.js";

export async function logAudit({
  actorId = null,
  actorName = "System",
  action,
  entityType,
  entityId = null,
  summary,
  details = "",
}) {
  return prisma.auditLog.create({
    data: {
      actorId,
      actorName,
      action,
      entityType,
      entityId,
      summary,
      details,
    },
  });
}

