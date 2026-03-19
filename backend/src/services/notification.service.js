import { prisma } from "../lib/prisma.js";

export async function createNotifications(recipients = [], payload = {}) {
  const uniqueRecipients = [...new Set((recipients || []).filter(Boolean))];
  if (!uniqueRecipients.length) return;

  await prisma.notification.createMany({
    data: uniqueRecipients.map((userId) => ({
      userId,
      type: payload.type || "info",
      title: payload.title || "Notificación",
      message: payload.message || "",
      entityType: payload.entityType || null,
      entityId: payload.entityId || null,
    })),
  });
}

export async function notifySupportNewTicket(ticket) {
  const supportUsers = await prisma.user.findMany({
    where: { role: "SUPPORT" },
    select: { id: true },
  });

  await createNotifications(
    supportUsers.map((user) => user.id),
    {
      type: "ticket_created",
      title: "Nuevo ticket",
      message: `${ticket.title}`,
      entityType: "ticket",
      entityId: ticket.id,
    }
  );
}

export async function notifyTicketComment(ticket, actorId, actorName, actorRole) {
  const recipients = new Set();

  if (ticket.createdById && ticket.createdById !== actorId) {
    recipients.add(ticket.createdById);
  }

  const supportUsers = await prisma.user.findMany({
    where: { role: "SUPPORT" },
    select: { id: true },
  });

  if (actorRole !== "support") {
    supportUsers.forEach((user) => recipients.add(user.id));
  }

  if (ticket.teamId) {
    const supervisors = await prisma.teamAssignment.findMany({
      where: { teamId: ticket.teamId, isSupervisor: true },
      select: { userId: true },
    });
    supervisors
      .filter((assignment) => assignment.userId !== actorId)
      .forEach((assignment) => recipients.add(assignment.userId));
  }

  await createNotifications([...recipients], {
    type: "ticket_comment",
    title: "Nuevo comentario",
    message: `${actorName} comentó en "${ticket.title}"`,
    entityType: "ticket",
    entityId: ticket.id,
  });
}

export async function notifyTicketStatusChange(ticket, actorId, actorName, nextStatus) {
  const recipients = new Set();

  if (ticket.createdById && ticket.createdById !== actorId) {
    recipients.add(ticket.createdById);
  }

  if (ticket.teamId) {
    const supervisors = await prisma.teamAssignment.findMany({
      where: { teamId: ticket.teamId, isSupervisor: true },
      select: { userId: true },
    });
    supervisors
      .filter((assignment) => assignment.userId !== actorId)
      .forEach((assignment) => recipients.add(assignment.userId));
  }

  await createNotifications([...recipients], {
    type: "ticket_status",
    title: "Cambio de estado",
    message: `${actorName} cambió "${ticket.title}" a ${nextStatus}`,
    entityType: "ticket",
    entityId: ticket.id,
  });
}
