import { teamsRepository } from "./teams/teams.repository.local.js";
import { ticketsRepository } from "./tickets/hooks/tickets.repository.local.js";
import { usersRepository } from "./tickets/users/users.repository.local.js";
import { inventoryRepository } from "./inventory/inventory.repository.local.js";
import { auditRepository } from "./audit/audit.repository.local.js";
import { clearAttachmentStore } from "./tickets/attachments/attachments.store.js";
import {
  ACTIVITY_OPTIONS,
  CATEGORIES,
  PRIORITIES,
  STATUSES,
} from "../shared/utils/tickets.js";

const SEED_KEY = "ts_seeded_v2";

const hashPassword = (value) => {
  let hash = 0;

  for (const char of value) {
    hash = (Math.imul(31, hash) + char.charCodeAt(0)) | 0;
  }

  return String(hash);
};

export function seedData() {
  if (localStorage.getItem(SEED_KEY)) return;

  const testHash = hashPassword("prueba1234");

  const users = [
    { id: "u1", name: "Valeria Nunez", email: "valeria.nunez@acme.local", role: "user", teamId: "t1", avatar: "VN", password: testHash },
    { id: "u2", name: "Ivan Castillo", email: "ivan.castillo@acme.local", role: "user", teamId: "t1", avatar: "IC", password: testHash },
    { id: "u3", name: "Fernanda Soto", email: "fernanda.soto@acme.local", role: "user", teamId: "t2", avatar: "FS", password: testHash },
    { id: "u4", name: "Jorge Marin", email: "jorge.marin@acme.local", role: "user", teamId: "t2", avatar: "JM", password: testHash },
    { id: "u5", name: "Camila Duarte", email: "camila.duarte@acme.local", role: "user", teamId: "t3", avatar: "CD", password: testHash },
    { id: "u6", name: "Omar Rios", email: "omar.rios@acme.local", role: "user", teamId: "t3", avatar: "OR", password: testHash },
    { id: "s1", name: "Paula Serrano", email: "paula.serrano@acme.local", role: "supervisor", teamId: "t1", avatar: "PS", password: testHash },
    { id: "s2", name: "Hector Ibarra", email: "hector.ibarra@acme.local", role: "supervisor", teamId: "t2", avatar: "HI", password: testHash },
    { id: "s3", name: "Alicia Franco", email: "alicia.franco@acme.local", role: "supervisor", teamId: "t3", avatar: "AF", password: testHash },
    { id: "sp1", name: "Marta Soporte", email: "marta.soporte@acme.local", role: "support", teamId: null, avatar: "MS", password: testHash },
  ];

  const teams = [
    { id: "t1", name: "Equipo Plataforma", supervisorIds: ["s1"], memberIds: ["u1", "u2", "s1"] },
    { id: "t2", name: "Equipo Operaciones", supervisorIds: ["s2"], memberIds: ["u3", "u4", "s2"] },
    { id: "t3", name: "Equipo Finanzas TI", supervisorIds: ["s3"], memberIds: ["u5", "u6", "s3"] },
  ];

  usersRepository.save(users);
  teamsRepository.save(teams);
  inventoryRepository.save([
    {
      id: "inv-001",
      assignedUserId: "u3",
      owningTeamId: "t1",
      assetName: "Laptop Lenovo ThinkPad T14",
      assetCategory: "Laptop",
      brand: "Lenovo",
      model: "ThinkPad T14 Gen 4",
      serialNumber: "LN-T14-8831",
      operatingSystem: "Windows 11 Pro",
      processor: "Intel Core i5",
      ram: "16 GB",
      storage: "512 GB SSD",
      status: "Activo",
      location: "CDMX - Piso 6",
      notes: "Equipo asignado para cierres contables.",
      comments: [],
      revisions: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "inv-002",
      assignedUserId: "u5",
      owningTeamId: "t3",
      assetName: "Desktop HP EliteDesk 800",
      assetCategory: "Desktop",
      brand: "HP",
      model: "EliteDesk 800 G6",
      serialNumber: "HP-ED8-4420",
      operatingSystem: "Windows 10 Pro",
      processor: "Intel Core i5",
      ram: "16 GB",
      storage: "1 TB SSD",
      status: "Activo",
      location: "GDL - Sala 2",
      notes: "Uso para conciliaciones semanales.",
      comments: [],
      revisions: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "inv-003",
      assignedUserId: "u2",
      owningTeamId: "t1",
      assetName: "MacBook Pro 14",
      assetCategory: "Laptop",
      brand: "Apple",
      model: "MacBook Pro M3",
      serialNumber: "APL-MBP14-1190",
      operatingSystem: "macOS Sequoia",
      processor: "Apple M3",
      ram: "18 GB",
      storage: "512 GB SSD",
      status: "Activo",
      location: "MTY - Torre Norte",
      notes: "Equipo de liderazgo tecnico.",
      comments: [],
      revisions: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);

  const titles = [
    "No sincroniza cliente de OneDrive",
    "Impresora fiscal sin conexion",
    "Error al firmar CFDI",
    "Solicitud de monitor adicional",
    "SAP bloqueado por permisos",
    "Caida intermitente de VPN",
    "No carga portal de compras",
    "Actualizacion de antivirus pendiente",
    "Equipo demasiado lento al iniciar",
    "Falla en lector de tarjetas",
    "Outlook no envia correos",
    "No abre carpeta de red",
    "Licencia de Office vencida",
    "Ajuste de acceso a BI",
    "Reemplazo de docking station",
  ];

  const now = new Date();
  const rawTickets = titles.map((title, index) => {
    const createdBy = ["u1", "u2", "u3", "u4", "u5", "u6", "s1", "s2", "s3"][index % 9];
    const team = teams.find((item) => item.memberIds.includes(createdBy));
    const status = STATUSES[index % STATUSES.length];
    const activity = ACTIVITY_OPTIONS[index % ACTIVITY_OPTIONS.length];
    const daysAgo = Math.floor(Math.random() * 30);
    const createdAt = new Date(now - daysAgo * 86_400_000).toISOString();

    const statusHistory = [
      { status: "Abierto", changedBy: createdBy, changedAt: createdAt, note: "Ticket creado" },
    ];

    if (status !== "Abierto") {
      statusHistory.push({
        status,
        changedBy: "sp1",
        changedAt: new Date(now - Math.max(daysAgo - 1, 0) * 86_400_000).toISOString(),
        note: "Procesado por soporte",
      });
    }

    return {
      id: `tk-${String(index + 1).padStart(4, "0")}`,
      title,
      description: `Descripcion detallada: ${title}. El usuario reporta el problema y requiere atencion.`,
      category: CATEGORIES[index % CATEGORIES.length],
      priority: PRIORITIES[index % PRIORITIES.length],
      activity,
      status,
      createdBy,
      teamId: team?.id ?? null,
      attachments: index % 3 === 0 ? ["captura_pantalla.png"] : [],
      comments: index % 2 === 0
        ? [{ id: `c${index}`, authorId: "sp1", authorRole: "support", text: "Revisando el caso.", createdAt: new Date(now - Math.max(daysAgo - 2, 0) * 86_400_000).toISOString() }]
        : [],
      statusHistory,
      createdAt,
      updatedAt: statusHistory.at(-1).changedAt,
    };
  });

  ticketsRepository.save(rawTickets);
  localStorage.setItem(SEED_KEY, "1");
}

export async function resetAllData() {
  usersRepository.clear();
  teamsRepository.clear();
  ticketsRepository.clear();
  inventoryRepository.clear();
  auditRepository.clear();
  await clearAttachmentStore();
  localStorage.removeItem(SEED_KEY);
  localStorage.removeItem("ts_session");
  localStorage.removeItem("ts_session_persist");
  localStorage.removeItem("ts_session_user");
  localStorage.removeItem("ts_auth_token");
  sessionStorage.removeItem("ts_session");
  sessionStorage.removeItem("ts_session_user");
  sessionStorage.removeItem("ts_auth_token");
}
