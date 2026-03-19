import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password.js";

const prisma = new PrismaClient();

async function main() {
  const supportEmail = "support@ticketflow.local";
  const supervisorEmail = "supervisor@ticketflow.local";
  const userEmail = "usuario@ticketflow.local";

  const support = await prisma.user.upsert({
    where: { email: supportEmail },
    update: {},
    create: {
      name: "Soporte Principal",
      email: supportEmail,
      role: "SUPPORT",
      avatar: "SP",
      passwordHash: await hashPassword("Support1234!"),
    },
  });

  const supervisor = await prisma.user.upsert({
    where: { email: supervisorEmail },
    update: {},
    create: {
      name: "Supervisor Equipo",
      email: supervisorEmail,
      role: "SUPERVISOR",
      avatar: "SE",
      passwordHash: await hashPassword("Supervisor1234!"),
    },
  });

  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: {},
    create: {
      name: "Usuario Base",
      email: userEmail,
      role: "USER",
      avatar: "UB",
      passwordHash: await hashPassword("Usuario1234!"),
    },
  });

  const team = await prisma.team.upsert({
    where: { name: "Equipo Plataforma" },
    update: {},
    create: { name: "Equipo Plataforma" },
  });

  await prisma.teamAssignment.upsert({
    where: { userId: supervisor.id },
    update: { teamId: team.id, isSupervisor: true },
    create: { userId: supervisor.id, teamId: team.id, isSupervisor: true },
  });

  await prisma.teamAssignment.upsert({
    where: { userId: user.id },
    update: { teamId: team.id, isSupervisor: false },
    create: { userId: user.id, teamId: team.id, isSupervisor: false },
  });

  await prisma.auditLog.create({
    data: {
      actorId: support.id,
      actorName: support.name,
      action: "seed",
      entityType: "system",
      summary: "Datos iniciales de backend creados",
      details: "Usuarios base y equipo principal",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
