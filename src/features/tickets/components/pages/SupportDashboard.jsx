
import { useEffect, useState, useMemo, useRef } from "react";
import {
  LayoutDashboard, Ticket, History, AlertCircle, Clock,
  CheckCircle2, Pause, Circle, AlertTriangle,
  ChevronRight, TrendingUp, Activity, Star,
  Settings, UserPlus, Users, FolderPlus, Trash2, Edit3, Eye, EyeOff, Monitor, Download, Upload,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import { useAuth } from "../../../../app/providers/auth-context.js";
import { useAllTickets, useUsers, useTeams } from "../../../../services/tickets/hooks/use-tickets.js";
import { usersApi, teamsApi } from "../../../../services/tickets/api/tickets.api.js";
import TicketDetail              from "../TicketDetail.jsx";
import InventoryAdminPanel       from "./InventoryAdminPanel.jsx";
import AuditLogPanel            from "./AuditLogPanel.jsx";
import Modal                     from "../../../../shared/components/Modal.jsx";
import Toast                     from "../../../../shared/components/Toast.jsx";
import { useResponsive }         from "../../../../shared/hooks/use-responsive.js";
import { applyFilters, defaultFilters, groupByMonth, STATUSES, PRIORITIES, CATEGORIES, ACTIVITY_OPTIONS }
  from "../../../../shared/utils/tickets.js";
import { getTicketDisplayId } from "../../../../shared/utils/tickets.js";
import { exportTicketsToCsv } from "../../../../shared/utils/export-history.js";
import { inventoryApi } from "../../../../services/inventory/inventory.api.js";
import { logAuditEntry } from "../../../../services/audit/audit.api.js";
import { isBackendEnabled } from "../../../../services/api/http-client.js";
import BrandMark from "../../../../shared/components/BrandMark.jsx";
import NotificationsBell from "../../../../shared/components/NotificationsBell.jsx";

function hashPassword(password) {
  let h = 0;
  for (let i = 0; i < password.length; i++) h = (Math.imul(31, h) + password.charCodeAt(i)) | 0;
  return String(h);
}
function getInitials(name = "") {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

/* ─── Design tokens ─────────────────────────────────────── */
const T = {
  bgPage:      "#f0f6ff",
  bgCard:      "#ffffff",
  bgHeader:    "linear-gradient(135deg, #1a3a6e 0%, #1e5bb5 100%)",
  bgTabBar:    "#e8f0fe",
  bgTabActive: "#ffffff",
  accent:      "#1e5bb5",
  accentLight: "#4a90d9",
  accentSky:   "#7ab8f5",
  accentPale:  "#dbeafe",
  border:      "#cce0ff",
  borderStrong:"#93c5fd",
  textPrimary: "#0f2a5e",
  textSecondary:"#4a6fa5",
  textMuted:   "#8aafd4",
  white:       "#ffffff",
  danger:      "#dc2626",
  dangerPale:  "#fef2f2",
  warning:     "#d97706",
  warningPale: "#fffbeb",
  success:     "#059669",
  successPale: "#f0fdf4",
  purple:      "#7c3aed",
  purplePale:  "#faf5ff",
};

/* ─── Chart tooltip ─────────────────────────────────────── */
const TOOLTIP_STYLE = {
  background: T.white,
  border:     `1px solid ${T.border}`,
  borderRadius: 8,
  fontSize:   12,
  color:      T.textPrimary,
  boxShadow:  "0 4px 16px rgba(30,91,181,0.12)",
};

/* ─── Status / Priority semantic colors ─────────────────── */
const STATUS_COLORS = {
  "Abierto":    { color: T.danger,  bg: T.dangerPale,  border: "#fecaca", chart: "#ef4444" },
  "En Proceso": { color: T.warning, bg: T.warningPale, border: "#fde68a", chart: "#f59e0b" },
  "Cerrado":    { color: T.success, bg: T.successPale, border: "#bbf7d0", chart: "#10b981" },
  "Aplazado":   { color: T.purple,  bg: T.purplePale,  border: "#ddd6fe", chart: "#7c3aed" },
};
const PRIORITY_COLORS = {
  baja: { color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0", chart: "#64748b" },
  media: { color: T.accent, bg: T.accentPale, border: "#bfdbfe", chart: T.accentLight },
  alta: { color: T.warning, bg: T.warningPale, border: "#fde68a", chart: "#f59e0b" },
  critica: { color: T.danger, bg: T.dangerPale, border: "#fecaca", chart: "#ef4444" },
};

function normalizePriorityLabel(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getPriorityStyle(label) {
  return PRIORITY_COLORS[normalizePriorityLabel(label)] || { color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0", chart: "#94a3b8" };
}

function renderRatingStars(rating) {
  const value = Number(rating || 0);
  if (!value) {
    return <span style={{ fontSize: 12, color: T.textMuted }}>Pendiente</span>;
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((index) => (
        <Star
          key={index}
          size={12}
          color={index <= value ? "#f59e0b" : "#d6e4f5"}
          fill={index <= value ? "#f59e0b" : "transparent"}
          strokeWidth={1.8}
        />
      ))}
    </span>
  );
}

function Pill({ label, map }) {
  const s = map[label] || { color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0" };
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 5, padding: "2px 10px", fontSize: 11, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function PriorityPill({ label }) {
  const s = getPriorityStyle(label);
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 5, padding: "2px 10px", fontSize: 11, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

/* ─── KPI Card ──────────────────────────────────────────── */
let supportCriticalKpiHandler = null;

function KpiCard({ label, value, icon, color, bg, subtitle, onClick }) {
  const IconComponent = icon;
  const clickHandler = label.includes("Cr") && supportCriticalKpiHandler ? supportCriticalKpiHandler : onClick;

  return (
    <div
      onClick={clickHandler}
      style={{
        background: T.bgCard, borderRadius: 12, padding: "18px 20px",
        border: `1px solid ${T.border}`, borderTop: `3px solid ${color}`,
        boxShadow: "0 2px 10px rgba(30,91,181,0.07)", position: "relative",
        overflow: "hidden", cursor: clickHandler ? "pointer" : "default",
        transition: "transform 0.2s, box-shadow 0.2s"
      }}
      onMouseEnter={(e) => { if (clickHandler) { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(30,91,181,0.15)"; } }}
      onMouseLeave={(e) => { if (clickHandler) { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 10px rgba(30,91,181,0.07)"; } }}
    >
      <div style={{ position: "absolute", right: -8, bottom: -8, opacity: 0.06 }}>
        <IconComponent size={72} color={color} />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: bg || `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <IconComponent size={15} color={color} strokeWidth={2.2} />
        </div>
      </div>
      <div style={{ fontSize: 36, fontWeight: 700, color: T.textPrimary, fontFamily: "var(--font-metric)", letterSpacing: "-0.04em", lineHeight: 1 }}>{value}</div>
      {subtitle && <p style={{ margin: "5px 0 0", fontSize: 11, color: T.textMuted, fontFamily: "'DM Sans', sans-serif" }}>{subtitle}</p>}
    </div>
  );
}

/* ─── Chart Card wrapper ────────────────────────────────── */
function ChartCard({ title, children, action }) {
  return (
    <div style={{ background: T.bgCard, borderRadius: 14, padding: "20px 22px", border: `1px solid ${T.border}`, boxShadow: "0 2px 10px rgba(30,91,181,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 3, height: 16, background: T.accent, borderRadius: 2 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>{title}</span>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ─── Tab ───────────────────────────────────────────────── */
function Tab({ label, icon: Icon, active, onClick }) {
  return (
    <button onClick={onClick} style={{ background: active ? T.bgCard : "transparent", color: active ? T.accent : T.textSecondary, border: "none", padding: "8px 18px", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: active ? 700 : 500, fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s", boxShadow: active ? "0 1px 6px rgba(30,91,181,0.14)" : "none", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
      {Icon && <Icon size={14} />}{label}
    </button>
  );
}

/* ─── Ticket Table (light) ──────────────────────────────── */
function LightTicketTable({ tickets, onSelect, showUser = false, users = [], teams = [] }) {
  const isBlockingActivity = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim() === "si";

  if (tickets.length === 0) return (
    <div style={{ textAlign: "center", padding: "52px 20px" }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: T.accentPale, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
        <Ticket size={24} color={T.accentLight} />
      </div>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>Sin resultados</p>
      <p style={{ margin: "4px 0 0", fontSize: 13, color: T.textMuted }}>Ajusta los filtros para ver tickets</p>
    </div>
  );
  const thS = { padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'DM Sans', sans-serif", background: T.bgPage, borderBottom: `1.5px solid ${T.border}`, whiteSpace: "nowrap" };
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            <th style={thS}>ID</th>
            <th style={thS}>Título</th>
            {showUser && <th style={thS}>Solicitante</th>}
            <th style={thS}>Categoría</th>
            <th style={thS}>Actividad</th>
            <th style={thS}>Prioridad</th>
            <th style={thS}>Estado</th>
            <th style={thS}>Calificacion</th>
            <th style={thS}>Fecha</th>
            <th style={thS}></th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t, i) => (
            <tr
              key={t.id}
              style={{ borderBottom: `1px solid ${T.border}`, cursor: "pointer", transition: "background 0.15s", background: i % 2 === 0 ? T.white : "#fafcff" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = T.accentPale)}
              onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? T.white : "#fafcff")}
              onClick={() => onSelect(t.id)}
            >
              <td style={{ padding: "12px 16px" }}>
                <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: T.accentLight, background: T.accentPale, padding: "2px 7px", borderRadius: 4 }}>
                  {getTicketDisplayId(t)}
                </span>
              </td>
              <td style={{ padding: "12px 16px", maxWidth: 220 }}>
                <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600, color: T.textPrimary }}>
                  {t.title}
                </span>
              </td>
              {showUser && (() => {
                const creator = users.find((u) => u.id === t.createdBy);
                const team = teams.find((tm) => tm.memberIds?.includes(t.createdBy));
                return (
                  <td style={{ padding: "12px 16px" }}>
                    <div>
                      <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: T.textPrimary }}>{t.createdByName || creator?.name || ""}</span>
                      {team && <span style={{ display: "inline-block", fontSize: 10, color: T.accentLight, background: T.accentPale, padding: "1px 7px", borderRadius: 4, marginTop: 2, fontWeight: 600 }}>{team.name}</span>}
                    </div>
                  </td>
                );
              })()}
              <td style={{ padding: "12px 16px" }}><span style={{ fontSize: 12, color: T.textSecondary }}>{t.category}</span></td>
              <td style={{ padding: "12px 16px" }}>
                {(() => {
                  const blocking = isBlockingActivity(t.activity);
                  return (
                    <span
                      title={blocking ? "Impide trabajar" : "No impide trabajar"}
                      aria-label={blocking ? "Impide trabajar" : "No impide trabajar"}
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        display: "inline-block",
                        background: blocking ? T.danger : T.success,
                        boxShadow: `0 0 0 2px ${blocking ? T.dangerPale : T.successPale}`,
                      }}
                    />
                  );
                })()}
              </td>
              <td style={{ padding: "12px 16px" }}><PriorityPill label={t.priority} /></td>
              <td style={{ padding: "12px 16px" }}><Pill label={t.status}   map={STATUS_COLORS}   /></td>
              <td style={{ padding: "12px 16px" }}>{renderRatingStars(t.supportRating)}</td>
              <td style={{ padding: "12px 16px" }}><span style={{ fontSize: 12, color: T.textMuted, fontFamily: "monospace" }}>{new Date(t.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}</span></td>
              <td style={{ padding: "12px 16px" }}>
                <div style={{ width: 26, height: 26, borderRadius: 6, background: T.accentPale, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ChevronRight size={13} color={T.accentLight} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Filters (light) ───────────────────────────────────── */
function LightFilters({ filters, setFilters, showUserFilter, users = [] }) {
  const iStyle = { background: T.bgPage, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "9px 14px", color: T.textPrimary, fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none", cursor: "pointer", transition: "border-color 0.2s" };
  const fo = (e) => (e.target.style.borderColor = T.accent);
  const bl = (e) => (e.target.style.borderColor = T.border);
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: "16px 24px", borderBottom: `1px solid ${T.border}`, background: T.bgPage }}>
      <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
        <svg style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input placeholder="Buscar tickets…" value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} style={{ ...iStyle, width: "100%", paddingLeft: 32, boxSizing: "border-box" }} onFocus={fo} onBlur={bl} />
      </div>
      {[
        { k: "status",   opts: ["Todos", ...STATUSES] },
        { k: "priority", opts: ["Todas", ...PRIORITIES] },
        { k: "activity", opts: ["Todas", ...ACTIVITY_OPTIONS], label: "¿Impide?" },
        { k: "category", opts: ["Todas", ...CATEGORIES] }
      ].map(({ k, opts, label }) => (
        <select key={k} value={filters[k]} onChange={(e) => setFilters((p) => ({ ...p, [k]: e.target.value }))} style={iStyle} onFocus={fo} onBlur={bl}>
          {label && <option disabled value="">{label}</option>}
          {opts.map((o) => <option key={o}>{o}</option>)}
        </select>
      ))}
      {showUserFilter && (
        <select value={filters.userId} onChange={(e) => setFilters((p) => ({ ...p, userId: e.target.value }))} style={iStyle} onFocus={fo} onBlur={bl}>
          <option value="">Todos los usuarios</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      )}
    </div>
  );
}

/* ═══════════════════ MAIN COMPONENT ════════════════════════ */
export default function SupportDashboard() {
  const { currentUser } = useAuth();
  const { isMobile } = useResponsive();
  const { data: allTickets = [], refetch } = useAllTickets();
  const { data: allUsers   = [], refetch: refetchUsers } = useUsers();
  const { data: allTeams   = [], refetch: refetchTeams } = useTeams();

  const [view, setView]             = useState("dashboard");
  const [filters, setFilters]       = useState(defaultFilters);
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast]           = useState(null);

  /* Admin state */
  const [showCreateUser, setShowCreateUser]   = useState(false);
  const [showCreateTeam, setShowCreateTeam]   = useState(false);
  const [editingUser, setEditingUser]         = useState(null);
  const [editingTeam, setEditingTeam]         = useState(null);
  const [viewingUser, setViewingUser]         = useState(null);
  const [viewingTeam, setViewingTeam]         = useState(null);
  const [adminSubView, setAdminSubView]       = useState("users");
  const [userSearch, setUserSearch]           = useState("");
  const [teamSearch, setTeamSearch]           = useState("");
  const userImportInputRef                     = useRef(null);

  useEffect(() => {
    const handleOpenTicket = (event) => {
      const ticketId = event.detail?.ticketId;
      if (!ticketId) return;
      setView("tickets");
      setSelectedId(ticketId);
    };

    window.addEventListener("ticketweb:open-ticket", handleOpenTicket);
    return () => window.removeEventListener("ticketweb:open-ticket", handleOpenTicket);
  }, []);

  const handleExportUsersExcel = async () => {
    const inventoryRows = await inventoryApi.getAll().catch(() => []);
    const rows = filteredUsers.map((user) => {
      const team = allTeams.find((t) => t.id === user.teamId || t.memberIds?.includes(user.id));
      const assignedEquipment = inventoryRows.find((item) => item.assignedUserId === user.id);
      return {
        Nombre: user.name || "",
        Correo: user.email || "",
        Rol: user.role || "user",
        Equipo: team?.name || "",
        EquipoComputo: assignedEquipment
          ? `${assignedEquipment.assetName || "Equipo"} (${assignedEquipment.serialNumber || "Sin serie"})`
          : "",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Usuarios");
    XLSX.writeFile(workbook, "usuarios.xlsx");
  };

  const normalizeImportedRole = (roleValue) => {
    const raw = String(roleValue || "").trim().toLowerCase();
    if (raw === "support" || raw === "soporte") return "support";
    if (raw === "supervisor") return "supervisor";
    return "user";
  };

  const handleImportUsersExcel = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

      if (!rows.length) {
        setToast("El archivo no contiene filas para importar");
        return;
      }

      let processed = 0;
      let skipped = 0;
      const teamsByName = await teamsApi.getAll();

      for (const row of rows) {
        const name = String(row.Nombre || row.nombre || row.Name || row.name || "").trim();
        const email = String(row.Correo || row.correo || row.Email || row.email || "").trim().toLowerCase();
        const role = normalizeImportedRole(row.Rol || row.rol || row.Role || row.role);
        const teamLabel = String(row.Equipo || row.equipo || row.Team || row.team || "").trim();

        if (!name || !email || !email.includes("@")) {
          skipped += 1;
          continue;
        }

        const matchedTeam = teamsByName.find((team) =>
          team.id === teamLabel || team.name?.toLowerCase() === teamLabel.toLowerCase(),
        ) || null;

        const existingUser = await usersApi.getByEmail(email);
        const user = existingUser
          ? await usersApi.update(existingUser.id, { name, role, avatar: getInitials(name) })
          : await usersApi.create({
              name,
              email,
              role,
              avatar: getInitials(name),
              password: isBackendEnabled() ? "prueba1234" : hashPassword("prueba1234"),
              teamId: null,
            });

        if (!user) {
          skipped += 1;
          continue;
        }

        if (matchedTeam && role !== "support") {
          await usersApi.update(user.id, { teamId: matchedTeam.id });
        } else {
          await usersApi.update(user.id, { teamId: null });
        }

        processed += 1;
      }

      refetchUsers();
      refetchTeams();
      setToast(`Importacion completada: ${processed} procesados, ${skipped} omitidos`);
    } catch {
      setToast("No se pudo importar el archivo Excel");
    }
  };

  const nonSupportUsers = useMemo(() => allUsers.filter((u) => u.role !== "support"), [allUsers]);
  const filteredUsers = (() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return allUsers;
    return allUsers.filter((u) =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.role || "").toLowerCase().includes(q)
    );
  })();
  const filteredTeams = (() => {
    const q = teamSearch.trim().toLowerCase();
    if (!q) return allTeams;
    return allTeams.filter((team) => {
      const supervisorIds = team.supervisorIds || (team.supervisorId ? [team.supervisorId] : []);
      const supervisorNames = supervisorIds
        .map((supId) => allUsers.find((u) => u.id === supId)?.name || "")
        .join(" ");
      return team.name.toLowerCase().includes(q) ||
        supervisorNames.toLowerCase().includes(q) ||
        (team.memberIds || []).some((id) => (allUsers.find((u) => u.id === id)?.name || "").toLowerCase().includes(q));
    });
  })();
  const filtered        = useMemo(() => applyFilters(allTickets, filters), [allTickets, filters]);

  const stats = useMemo(() => {
    const byStatus   = STATUSES.reduce((a, s) => ({ ...a, [s]: allTickets.filter((t) => t.status   === s).length }), {});
    const byPriority = PRIORITIES.reduce((a, p) => ({ ...a, [p]: allTickets.filter((t) => t.priority === p).length }), {});
    const byCategory = CATEGORIES.reduce((a, c) => ({ ...a, [c]: allTickets.filter((t) => t.category === c).length }), {});
    const critical   = allTickets.filter((t) => (t.priority === "Crítica" || t.activity === "Sí") && t.status !== "Cerrado").length;
    return { total: allTickets.length, byStatus, byPriority, byCategory, critical };
  }, [allTickets]);

  const handleKpiClick = (status) => {
    setFilters(prev => ({ ...prev, status: status || "Todos", priority: "Todas" }));
    setView("tickets");
    setTimeout(() => {
      document.getElementById("ticket-list-area")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };
  const handleCriticalKpiClick = () => {
    setFilters((prev) => ({ ...prev, status: "Todos", priority: "Crítica", activity: "Todas" }));
    setView("tickets");
    setTimeout(() => {
      document.getElementById("ticket-list-area")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };
  const handleExportHistory = () => {
    exportTicketsToCsv(filtered, allUsers, allTeams, "historial-global.xlsx");
  };
  useEffect(() => {
    supportCriticalKpiHandler = handleCriticalKpiClick;
    return () => {
      supportCriticalKpiHandler = null;
    };
  }, []);

  const chartStatusData = STATUSES.map((s) => ({ name: s, value: stats.byStatus[s], color: STATUS_COLORS[s]?.chart || "#94a3b8" }));
  const prioData        = PRIORITIES.map((p) => ({ name: p, tickets: stats.byPriority[p], color: getPriorityStyle(p).chart }));
  const catData         = CATEGORIES.map((c) => ({ name: c, value: stats.byCategory[c] }));

  const weekData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return { day: d.toLocaleDateString("es-MX", { weekday: "short" }), date: d.toDateString() };
    });
    return days.map(({ day, date }) => ({
      day,
      Creados:  allTickets.filter((t) => new Date(t.createdAt).toDateString() === date).length,
      Cerrados: allTickets.filter((t) => t.status === "Cerrado" && new Date(t.updatedAt).toDateString() === date).length,
    }));
  }, [allTickets]);


  const currentDate = new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div style={{ background: T.bgPage, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", padding: isMobile ? 12 : 20 }}>

      {/* ── Page Header ──────────────────────────────── */}
      <div style={{ background: T.bgHeader, borderRadius: 16, padding: isMobile ? "18px 16px" : "26px 32px", marginBottom: 28, color: T.white, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, boxShadow: "0 4px 24px rgba(30,91,181,0.25)", position: "relative", overflow: "visible" }}>
        <div style={{ position: "absolute", right: -30, top: -30, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
        <div style={{ position: "absolute", right: 100, bottom: -50, width: 130, height: 130, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BrandMark size={24} />
            </div>
            <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 24, fontWeight: 800, fontFamily: "'DM Sans', sans-serif", letterSpacing: "-0.02em" }}>Centro de Soporte</h1>
          </div>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.75 }}>
            Gestión global de todos los tickets &nbsp;·&nbsp; <span style={{ textTransform: "capitalize" }}>{currentDate}</span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, position: "relative", zIndex: 1, alignItems: "center" }}>
          <NotificationsBell compact={isMobile} />
        </div>
      </div>

      {/* ── Tab nav ──────────────────────────────────── */}
      <div style={{ display: "flex", gap: 4, background: T.bgTabBar, borderRadius: 10, padding: 4, marginBottom: 24, width: isMobile ? "100%" : "fit-content", overflowX: "auto", border: `1px solid ${T.border}` }}>
        {[["dashboard", "Dashboard", LayoutDashboard], ["tickets", "Gestión", Ticket], ["historial", "Historial", History], ["admin", "Administración", Settings]].map(([v, l, Icon]) => (
          <Tab key={v} label={l} icon={Icon} active={view === v} onClick={() => { setView(v); setFilters(defaultFilters); }} />
        ))}
      </div>

      {/* ══════════════ DASHBOARD VIEW ══════════════════ */}
      {view === "dashboard" && (
        <div>
          {/* KPIs — 6 columns */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(6, 1fr)", gap: 14, marginBottom: 24 }}>
            <KpiCard label="Total"      value={stats.total}                  icon={Activity}      color={T.accent}  bg={T.accentPale} onClick={() => handleKpiClick(null)} />
            <KpiCard label="Abiertos"   value={stats.byStatus["Abierto"]}    icon={Circle}        color={T.danger}  bg={T.dangerPale} onClick={() => handleKpiClick("Abierto")} />
            <KpiCard label="En Proceso" value={stats.byStatus["En Proceso"]} icon={Clock}         color={T.warning} bg={T.warningPale} onClick={() => handleKpiClick("En Proceso")} />
            <KpiCard label="Cerrados"   value={stats.byStatus["Cerrado"]}    icon={CheckCircle2}  color={T.success} bg={T.successPale} onClick={() => handleKpiClick("Cerrado")} />
            <KpiCard label="Aplazados"  value={stats.byStatus["Aplazado"]}   icon={Pause}         color={T.purple}  bg={T.purplePale} onClick={() => handleKpiClick("Aplazado")} />
            <KpiCard label="Críticos"   value={stats.critical}               icon={AlertTriangle} color={T.danger}  bg={T.dangerPale} subtitle="Sin resolver" onClick={() => { setFilters(p => ({ ...p, status: "Todos", priority: "Todas", activity: "Todas" })); setView("tickets"); }} />
          </div>

          {/* Charts row 1 */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.4fr 1fr", gap: 18, marginBottom: 18 }}>

            {/* Weekly line chart */}
            <ChartCard title="Actividad — Últimos 7 días">
              <ResponsiveContainer width="100%" height={190}>
                <LineChart data={weekData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.accentPale} />
                  <XAxis dataKey="day" tick={{ fill: T.textMuted, fontSize: 11, fontFamily: "'DM Sans'" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: T.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 12, color: T.textSecondary, fontFamily: "'DM Sans'" }} />
                  <Line type="monotone" dataKey="Creados"  stroke={T.danger}  strokeWidth={2.5} dot={{ fill: T.danger,  r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Cerrados" stroke={T.success} strokeWidth={2.5} dot={{ fill: T.success, r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Donut by status */}
            <ChartCard title="Distribución por Estado">
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <ResponsiveContainer width={150} height={150}>
                  <PieChart>
                    <Pie data={chartStatusData} cx="50%" cy="50%" innerRadius={42} outerRadius={68} dataKey="value" strokeWidth={2} stroke={T.white}>
                      {chartStatusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexDirection: "column", gap: 9, flex: 1 }}>
                  {chartStatusData.map((d) => {
                    const s = STATUS_COLORS[d.name];
                    return (
                      <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: T.textSecondary, flex: 1, fontFamily: "'DM Sans'" }}>{d.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: s?.color || T.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>{d.value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </ChartCard>
          </div>

          {/* Charts row 2 */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 18, marginBottom: 20 }}>

            {/* By priority — horizontal bars */}
            <ChartCard title="Tickets por Prioridad">
              <ResponsiveContainer width="100%" height={148}>
                <BarChart data={prioData} layout="vertical" margin={{ top: 0, right: 12, left: -10, bottom: 0 }}>
                  <XAxis type="number" tick={{ fill: T.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fill: T.textSecondary, fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans'" }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="tickets" radius={[0, 6, 6, 0]} maxBarSize={22}>
                    {prioData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* By category — vertical bars */}
            <ChartCard title="Tickets por Categoría">
              <ResponsiveContainer width="100%" height={148}>
                <BarChart data={catData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: T.textMuted, fontSize: 10, fontFamily: "'DM Sans'" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: T.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={36}>
                    {catData.map((_, i) => <Cell key={i} fill={[T.accent, T.accentLight, T.accentSky, "#93c5fd", "#bfdbfe"][i % 5]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Recent tickets */}
          <div style={{ background: T.bgCard, borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden", boxShadow: "0 2px 10px rgba(30,91,181,0.06)" }}>
            <div style={{ padding: "16px 24px", background: T.bgPage, borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 3, height: 16, background: T.accent, borderRadius: 2 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>Tickets Recientes</span>
              </div>
              <button onClick={() => setView("tickets")} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 7, padding: "6px 14px", color: T.accent, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 5, transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.background = T.accentPale; }} onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}>
                Ver todos <ChevronRight size={13} />
              </button>
            </div>
            <LightTicketTable
              tickets={[...allTickets]
                .filter(t => t.status !== "Cerrado")
                .sort((a, b) => {
                  const statusOrder = { "Abierto": 0, "En Proceso": 1, "Aplazado": 2 };
                  const orderA = statusOrder[a.status] ?? 99;
                  const orderB = statusOrder[b.status] ?? 99;
                  if (orderA !== orderB) return orderA - orderB;
                  return new Date(b.updatedAt) - new Date(a.updatedAt);
                })
                .slice(0, 8)}
              onSelect={setSelectedId}
              showUser
              users={allUsers}
              teams={allTeams}
            />
          </div>
        </div>
      )}

      {/* ══════════════ TICKETS / HISTORIAL ════════════ */}
      {(view === "tickets" || view === "historial") && (
        <div id="ticket-list-area" style={{ background: T.bgCard, borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden", boxShadow: "0 2px 10px rgba(30,91,181,0.06)" }}>
          {/* Header */}
          <div style={{ padding: "18px 24px", background: T.bgPage, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 3, height: 16, background: T.accent, borderRadius: 2 }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>
                {view === "tickets" ? "Todos los Tickets" : "Historial Global"}
              </span>
              <span style={{ fontSize: 12, background: T.accentPale, color: T.accent, border: `1px solid ${T.borderStrong}`, borderRadius: 10, padding: "1px 10px", fontWeight: 700, fontFamily: "monospace" }}>
                {filtered.length}
              </span>
            </div>
            {view === "historial" && (
              <button onClick={handleExportHistory} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 12px", color: T.accent, cursor: "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                <Download size={14} /> Exportar Excel
              </button>
            )}
          </div>

          {/* Filters */}
          <LightFilters filters={filters} setFilters={setFilters} showUserFilter users={nonSupportUsers} />

          {/* Content */}
          {view === "historial" ? (
            <div style={{ padding: "16px 24px" }}>
              {Object.entries(groupByMonth(filtered)).map(([month, mTickets]) => (
                <div key={month} style={{ marginBottom: 28 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: T.accent, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'DM Sans', sans-serif" }}>{month}</span>
                    <div style={{ flex: 1, height: 1, background: T.border }} />
                    <span style={{ fontSize: 11, color: T.textMuted, fontFamily: "monospace" }}>{mTickets.length} tickets</span>
                  </div>
                  <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${T.border}` }}>
                    <LightTicketTable tickets={mTickets} onSelect={setSelectedId} showUser users={allUsers} teams={allTeams} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <LightTicketTable tickets={filtered} onSelect={setSelectedId} showUser users={allUsers} teams={allTeams} />
          )}
        </div>
      )}

      {/* ══════════════ ADMIN VIEW ═════════════════════ */}
      {view === "admin" && (
        <div>
          {/* Admin sub-tabs */}
          <div style={{ display: "flex", gap: 4, background: T.bgTabBar, borderRadius: 10, padding: 4, marginBottom: 20, width: isMobile ? "100%" : "fit-content", overflowX: "auto", border: `1px solid ${T.border}` }}>
            <Tab label="Usuarios" icon={Users} active={adminSubView === "users"} onClick={() => setAdminSubView("users")} />
            <Tab label="Equipos" icon={FolderPlus} active={adminSubView === "teams"} onClick={() => setAdminSubView("teams")} />
            <Tab label="Inventario" icon={Monitor} active={adminSubView === "inventory"} onClick={() => setAdminSubView("inventory")} />
            <Tab label="Historial" icon={History} active={adminSubView === "audit"} onClick={() => setAdminSubView("audit")} />
          </div>

          {/* ── Users management ─────────────────── */}
          {adminSubView === "users" && (
            <div style={{ background: T.bgCard, borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden", boxShadow: "0 2px 10px rgba(30,91,181,0.06)" }}>
              <div style={{ padding: "18px 24px", background: T.bgPage, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 3, height: 16, background: T.accent, borderRadius: 2 }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>Gestión de Usuarios</span>
                  <span style={{ fontSize: 12, background: T.accentPale, color: T.accent, border: `1px solid ${T.borderStrong}`, borderRadius: 10, padding: "1px 10px", fontWeight: 700, fontFamily: "monospace" }}>{filteredUsers.length}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", width: isMobile ? "100%" : "auto" }}>
                  <input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Buscar por nombre, correo o rol..."
                    style={{ minWidth: isMobile ? "100%" : 220, width: isMobile ? "100%" : "auto", background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 12px", color: T.textPrimary, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}
                  />
                  <input
                    ref={userImportInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleImportUsersExcel}
                    style={{ display: "none" }}
                  />
                  <button
                    onClick={() => handleExportUsersExcel()}
                    style={{ width: isMobile ? "100%" : "auto", justifyContent: "center", background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: T.accent }}
                  >
                    <Download size={14} /> Exportar Excel
                  </button>
                  <button
                    onClick={() => userImportInputRef.current?.click()}
                    style={{ width: isMobile ? "100%" : "auto", justifyContent: "center", background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: T.accent }}
                  >
                    <Upload size={14} /> Importar Excel
                  </button>
                  <button onClick={() => { setEditingUser(null); setShowCreateUser(true); }} style={{ width: isMobile ? "100%" : "auto", justifyContent: "center", background: `linear-gradient(135deg, ${T.accent} 0%, ${T.accentLight} 100%)`, color: T.white, border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 10px rgba(30,91,181,0.25)", transition: "opacity 0.2s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
                    <UserPlus size={14} /> Crear Usuario
                  </button>
                </div>
              </div>
              {isMobile ? (
                <div style={{ display: "grid", gap: 12, padding: 12 }}>
                  {filteredUsers.map((u) => {
                    const team = allTeams.find((t) => t.memberIds?.includes(u.id));
                    const roleLbl = { user: "Usuario", supervisor: "Supervisor", support: "Soporte" }[u.role] || u.role;
                    const roleColor = { user: "#64748b", supervisor: "#7c3aed", support: T.accent }[u.role];
                    return (
                      <div key={u.id} onClick={() => { setViewingUser(u); }} style={{ border: `1px solid ${T.border}`, borderRadius: 12, background: T.white, padding: 14, boxShadow: "0 2px 10px rgba(30,91,181,0.06)", cursor: "pointer" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                          <div style={{ width: 38, height: 38, borderRadius: "50%", background: T.accentPale, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: T.accent }}>{u.avatar || "??"}</div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</p>
                            <p style={{ margin: "2px 0 0", fontSize: 11, color: T.textSecondary, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</p>
                          </div>
                        </div>
                        <div style={{ display: "grid", gap: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                            <span style={{ fontSize: 11, color: T.textMuted, textTransform: "uppercase", fontWeight: 700 }}>Rol</span>
                            <span style={{ background: `${roleColor}14`, color: roleColor, border: `1px solid ${roleColor}30`, borderRadius: 5, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{roleLbl}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                            <span style={{ fontSize: 11, color: T.textMuted, textTransform: "uppercase", fontWeight: 700 }}>Equipo</span>
                            <span style={{ fontSize: 12, color: T.textSecondary, textAlign: "right" }}>{team?.name || "Sin equipo"}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                          <button onClick={(e) => { e.stopPropagation(); setEditingUser(u); setShowCreateUser(true); }} style={{ flex: 1, background: T.accentPale, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 10px", cursor: "pointer", color: T.accent, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontWeight: 700 }}>
                            <Edit3 size={13} /> Editar
                          </button>
                          <button onClick={async (e) => {
                            e.stopPropagation();
                            await usersApi.delete(u.id);
                            logAuditEntry({
                              actorId: currentUser.id,
                              actorName: currentUser.name,
                              action: "eliminacion",
                              entityType: "usuario",
                              entityId: u.id,
                              summary: `Usuario eliminado: ${u.name}`,
                              details: `Correo: ${u.email} · Rol: ${u.role}`,
                            });
                            await Promise.all([refetchUsers(), refetchTeams()]);
                            setToast(`Usuario ${u.name} eliminado`);
                          }} style={{ flex: 1, background: T.dangerPale, border: "1px solid #fecaca", borderRadius: 8, padding: "8px 10px", cursor: "pointer", color: T.danger, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontWeight: 700 }}>
                            <Trash2 size={13} /> Eliminar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      {["Avatar", "Nombre", "Email", "Rol", "Equipo", "Acciones"].map((h) => (
                        <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'DM Sans', sans-serif", background: T.bgPage, borderBottom: `1.5px solid ${T.border}`, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u, i) => {
                      const team = allTeams.find((t) => t.memberIds?.includes(u.id));
                      const roleLbl = { user: "Usuario", supervisor: "Supervisor", support: "Soporte" }[u.role] || u.role;
                      const roleColor = { user: "#64748b", supervisor: "#7c3aed", support: T.accent }[u.role];
                      return (
                        <tr
                          key={u.id}
                          onClick={() => { setViewingUser(u); }}
                          style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 === 0 ? T.white : "#fafcff", cursor: "pointer" }}
                        >
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ width: 34, height: 34, borderRadius: "50%", background: T.accentPale, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: T.accent, fontFamily: "'DM Sans', sans-serif" }}>{u.avatar || "??"}</div>
                          </td>
                          <td style={{ padding: "12px 16px", fontWeight: 600, color: T.textPrimary }}>{u.name}</td>
                          <td style={{ padding: "12px 16px", color: T.textSecondary, fontSize: 12, fontFamily: "monospace" }}>{u.email}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ background: `${roleColor}14`, color: roleColor, border: `1px solid ${roleColor}30`, borderRadius: 5, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{roleLbl}</span>
                          </td>
                          <td style={{ padding: "12px 16px", color: T.textSecondary, fontSize: 12 }}>{team?.name || "Sin equipo"}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button onClick={(e) => { e.stopPropagation(); setEditingUser(u); setShowCreateUser(true); }} style={{ background: T.accentPale, border: `1px solid ${T.border}`, borderRadius: 6, padding: "5px 8px", cursor: "pointer", color: T.accent, display: "flex", alignItems: "center" }} title="Editar">
                                <Edit3 size={13} />
                              </button>
                              <button onClick={async (e) => {
                                e.stopPropagation();
                                await usersApi.delete(u.id);
                                logAuditEntry({
                                  actorId: currentUser.id,
                                  actorName: currentUser.name,
                                  action: "eliminacion",
                                  entityType: "usuario",
                                  entityId: u.id,
                                  summary: `Usuario eliminado: ${u.name}`,
                                  details: `Correo: ${u.email} · Rol: ${u.role}`,
                                });
                                await Promise.all([refetchUsers(), refetchTeams()]);
                                setToast(`Usuario ${u.name} eliminado`);
                              }} style={{ background: T.dangerPale, border: "1px solid #fecaca", borderRadius: 6, padding: "5px 8px", cursor: "pointer", color: T.danger, display: "flex", alignItems: "center" }} title="Eliminar">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              )}
            </div>
          )}

          {/* ── Teams management ─────────────────── */}
          {adminSubView === "teams" && (
            <div style={{ background: T.bgCard, borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden", boxShadow: "0 2px 10px rgba(30,91,181,0.06)" }}>
              <div style={{ padding: "18px 24px", background: T.bgPage, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 3, height: 16, background: T.accent, borderRadius: 2 }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>Gestión de Equipos</span>
                  <span style={{ fontSize: 12, background: T.accentPale, color: T.accent, border: `1px solid ${T.borderStrong}`, borderRadius: 10, padding: "1px 10px", fontWeight: 700, fontFamily: "monospace" }}>{filteredTeams.length}</span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", width: isMobile ? "100%" : "auto" }}>
                  <input
                    value={teamSearch}
                    onChange={(e) => setTeamSearch(e.target.value)}
                    placeholder="Buscar equipo, supervisor o miembro..."
                    style={{ minWidth: isMobile ? "100%" : 280, background: T.white, border: `1.4px solid ${T.border}`, borderRadius: 8, padding: "9px 12px", color: T.textPrimary, fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none" }}
                    onFocus={(e) => (e.target.style.borderColor = T.accent)}
                    onBlur={(e) => (e.target.style.borderColor = T.border)}
                  />
                  <button onClick={() => { setEditingTeam(null); setShowCreateTeam(true); }} style={{ width: isMobile ? "100%" : "auto", justifyContent: "center", background: `linear-gradient(135deg, ${T.accent} 0%, ${T.accentLight} 100%)`, color: T.white, border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 10px rgba(30,91,181,0.25)", transition: "opacity 0.2s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
                    <FolderPlus size={14} /> Crear Equipo
                  </button>
                </div>
              </div>
              {isMobile ? (
                <div style={{ display: "grid", gap: 12, padding: 12 }}>
                  {filteredTeams.map((team) => {
                    const supervisorIds = team.supervisorIds || (team.supervisorId ? [team.supervisorId] : []);
                    const supervisors = allUsers.filter((u) => supervisorIds.includes(u.id));
                    const members = allUsers.filter((u) => team.memberIds?.includes(u.id) && !supervisorIds.includes(u.id));
                    return (
                      <div key={team.id} onClick={() => { setViewingTeam(team); }} style={{ border: `1px solid ${T.border}`, borderRadius: 12, background: T.white, padding: 14, boxShadow: "0 2px 10px rgba(30,91,181,0.06)", cursor: "pointer" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.textPrimary }}>{team.name}</p>
                            <p style={{ margin: "4px 0 0", fontSize: 11, color: T.textMuted, textTransform: "uppercase", fontWeight: 700 }}>Supervision</p>
                            <p style={{ margin: "2px 0 0", fontSize: 12, color: T.textSecondary }}>{supervisors.length > 0 ? supervisors.map((sup) => sup.name).join(", ") : "Sin supervisor"}</p>
                          </div>
                          <span style={{ background: T.accentPale, color: T.accent, borderRadius: 10, padding: "3px 10px", fontSize: 12, fontWeight: 700, fontFamily: "monospace", flexShrink: 0 }}>{members.length}</span>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                          {members.length > 0 ? members.map((m) => (
                            <span key={m.id} style={{ background: T.accentPale, color: T.accent, borderRadius: 999, padding: "4px 8px", fontSize: 11, fontWeight: 600 }}>{m.name}</span>
                          )) : <span style={{ color: T.textMuted, fontSize: 12 }}>Sin miembros</span>}
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={(e) => {
                            e.stopPropagation();
                            setEditingTeam(team);
                          }} style={{ flex: 1, background: T.accentPale, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 10px", cursor: "pointer", color: T.accent, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontWeight: 700 }}>
                            <Edit3 size={13} /> Editar
                          </button>
                          <button onClick={async (e) => {
                            e.stopPropagation();
                            await teamsApi.delete(team.id);
                            logAuditEntry({
                              actorId: currentUser.id,
                              actorName: currentUser.name,
                              action: "eliminacion",
                              entityType: "equipo",
                              entityId: team.id,
                              summary: `Equipo eliminado: ${team.name}`,
                              details: `Miembros registrados: ${members.length}`,
                            });
                            await Promise.all([refetchTeams(), refetchUsers()]);
                            setToast(`Equipo ${team.name} eliminado`);
                          }} style={{ flex: 1, background: T.dangerPale, border: "1px solid #fecaca", borderRadius: 8, padding: "8px 10px", cursor: "pointer", color: T.danger, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontWeight: 700 }}>
                            <Trash2 size={13} /> Eliminar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      {["Nombre", "Supervisor", "Miembros", "# Miembros", "Acciones"].map((h) => (
                        <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'DM Sans', sans-serif", background: T.bgPage, borderBottom: `1.5px solid ${T.border}`, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeams.map((team, i) => {
                      const supervisorIds = team.supervisorIds || (team.supervisorId ? [team.supervisorId] : []);
                      const supervisors = allUsers.filter((u) => supervisorIds.includes(u.id));
                      const members = allUsers.filter((u) => team.memberIds?.includes(u.id) && !supervisorIds.includes(u.id));
                      return (
                        <tr
                          key={team.id}
                          onClick={() => { setViewingTeam(team); }}
                          style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 === 0 ? T.white : "#fafcff", cursor: "pointer" }}
                        >
                          <td style={{ padding: "12px 16px", fontWeight: 600, color: T.textPrimary }}>{team.name}</td>
                          <td style={{ padding: "12px 16px", color: T.textSecondary, fontSize: 12 }}>
                            {supervisors.length > 0 ? supervisors.map((sup) => sup.name).join(", ") : "—"}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                              {members.map((m) => (
                                <span key={m.id} style={{ background: T.accentPale, color: T.accent, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{m.name}</span>
                              ))}
                              {members.length === 0 && <span style={{ color: T.textMuted, fontSize: 12 }}>Sin miembros</span>}
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ background: T.accentPale, color: T.accent, borderRadius: 10, padding: "2px 10px", fontSize: 12, fontWeight: 700, fontFamily: "monospace" }}>{members.length}</span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <button onClick={async (e) => {
                              e.stopPropagation();
                              await teamsApi.delete(team.id);
                              logAuditEntry({
                                actorId: currentUser.id,
                                actorName: currentUser.name,
                                action: "eliminacion",
                                entityType: "equipo",
                                entityId: team.id,
                                summary: `Equipo eliminado: ${team.name}`,
                                details: `Miembros registrados: ${members.length}`,
                              });
                              await Promise.all([refetchTeams(), refetchUsers()]);
                              setToast(`Equipo ${team.name} eliminado`);
                            }} style={{ background: T.dangerPale, border: "1px solid #fecaca", borderRadius: 6, padding: "5px 8px", cursor: "pointer", color: T.danger, display: "flex", alignItems: "center" }} title="Eliminar">
                              <Trash2 size={13} />
                            </button>
                            <button onClick={(e) => {
                              e.stopPropagation();
                              setEditingTeam(team);
                            }} style={{ background: T.accentPale, border: `1px solid ${T.border}`, borderRadius: 6, padding: "5px 8px", cursor: "pointer", color: T.accent, display: "flex", alignItems: "center", marginRight: 6 }} title="Editar equipo">
                              <Edit3 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              )}
            </div>
          )}

          {adminSubView === "inventory" && (
            <InventoryAdminPanel
              key={filteredUsers.map((user) => user.id).join("-")}
              users={allUsers}
              teams={allTeams}
              currentUser={currentUser}
              onToast={setToast}
            />
          )}

          {adminSubView === "audit" && <AuditLogPanel />}
        </div>
      )}

      {/* ── Modals ───────────────────────────────────── */}
      {selectedId && (
        <Modal title="Detalle del Ticket" onClose={() => { setSelectedId(null); refetch(); }} width={700}>
          <TicketDetail ticketId={selectedId} canChangeStatus={true} canComment={true} onClose={() => setSelectedId(null)} onUpdate={refetch} knownUsers={allUsers} />
        </Modal>
      )}

      {/* ── Create/Edit User Modal ─────────────────── */}
      {showCreateUser && (
        <Modal title={editingUser ? "Editar Usuario" : "Crear Usuario"} onClose={() => setShowCreateUser(false)} width={520}>
          <UserInventoryFormModal
            user={editingUser}
            users={allUsers}
            teams={allTeams}
            currentUser={currentUser}
            onClose={() => setShowCreateUser(false)}
            onSuccess={(msg) => { setToast(msg); refetchUsers(); refetchTeams(); setShowCreateUser(false); }}
          />
        </Modal>
      )}

      {viewingUser && (
        <Modal title="Detalle de Usuario" onClose={() => setViewingUser(null)} width={520}>
          <UserInfoModal user={viewingUser} teams={allTeams} onClose={() => setViewingUser(null)} />
        </Modal>
      )}

      {/* ── Create Team Modal ──────────────────────── */}
      {showCreateTeam && (
        <Modal title={editingTeam ? "Editar Equipo" : "Crear Equipo"} onClose={() => { setShowCreateTeam(false); setEditingTeam(null); }} width={560}>
          <TeamFormModal
            team={editingTeam}
            users={allUsers}
            currentUser={currentUser}
            onClose={() => { setShowCreateTeam(false); setEditingTeam(null); }}
            onSuccess={(msg) => { setToast(msg); refetchTeams(); refetchUsers(); setShowCreateTeam(false); setEditingTeam(null); }}
          />
        </Modal>
      )}

      {viewingTeam && (
        <Modal title="Detalle de Equipo" onClose={() => setViewingTeam(null)} width={560}>
          <TeamInfoModal team={viewingTeam} users={allUsers} onClose={() => setViewingTeam(null)} />
        </Modal>
      )}

      {editingTeam && !showCreateTeam && (
        <Modal title="Editar Equipo" onClose={() => setEditingTeam(null)} width={560}>
          <TeamEditModal
            team={editingTeam}
            users={allUsers}
            currentUser={currentUser}
            onClose={() => setEditingTeam(null)}
            onSuccess={(msg) => { setToast(msg); refetchTeams(); refetchUsers(); setEditingTeam(null); }}
          />
        </Modal>
      )}

      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
    </div>
  );
}

/* ═══════════════════ USER FORM MODAL ══════════════════════ */
function UserInfoModal({ user, teams, onClose }) {
  const team = teams.find((t) => t.memberIds?.includes(user?.id));
  const [assignedEquipment, setAssignedEquipment] = useState(null);
  useEffect(() => {
    let active = true;
    if (!user?.id) return () => { active = false; };
    inventoryApi.getAll().then((items) => {
      if (!active) return;
      const found = (Array.isArray(items) ? items : []).find((item) => item.assignedUserId === user.id) || null;
      setAssignedEquipment(found);
    }).catch(() => {
      if (active) setAssignedEquipment(null);
    });
    return () => { active = false; };
  }, [user?.id]);
  const roleLbl = { user: "Usuario", supervisor: "Supervisor", support: "Soporte" }[user?.role] || user?.role || "N/A";
  const rowSt = { margin: "0 0 10px", fontSize: 13, color: T.textSecondary };
  const labelSt = { display: "inline-block", minWidth: 110, fontWeight: 700, color: T.textPrimary };
  return (
    <div>
      <p style={rowSt}><span style={labelSt}>Nombre:</span>{user?.name || "N/A"}</p>
      <p style={rowSt}><span style={labelSt}>Correo:</span>{user?.email || "N/A"}</p>
      <p style={rowSt}><span style={labelSt}>Rol:</span>{roleLbl}</p>
      <p style={rowSt}><span style={labelSt}>Equipo:</span>{team?.name || "Sin equipo"}</p>
      <p style={rowSt}>
        <span style={labelSt}>Equipo de cómputo:</span>
        {assignedEquipment
          ? `${assignedEquipment.assetName || "Equipo"} (${assignedEquipment.serialNumber || "Sin serie"})`
          : "Sin equipo asignado"}
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
        <button onClick={onClose} style={{ background: T.bgPage, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "9px 18px", color: T.textSecondary, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Cerrar</button>
      </div>
    </div>
  );
}

function TeamInfoModal({ team, users, onClose }) {
  const supervisorIds = team?.supervisorIds || (team?.supervisorId ? [team.supervisorId] : []);
  const supervisors = users.filter((u) => supervisorIds.includes(u.id));
  const members = users.filter((u) => team?.memberIds?.includes(u.id) && !supervisorIds.includes(u.id));
  const rowSt = { margin: "0 0 10px", fontSize: 13, color: T.textSecondary };
  const labelSt = { display: "inline-block", minWidth: 110, fontWeight: 700, color: T.textPrimary };
  return (
    <div>
      <p style={rowSt}><span style={labelSt}>Nombre:</span>{team?.name || "N/A"}</p>
      <p style={rowSt}><span style={labelSt}>Supervisores:</span>{supervisors.length ? supervisors.map((u) => u.name).join(", ") : "Sin supervisores"}</p>
      <p style={rowSt}><span style={labelSt}># Miembros:</span>{members.length}</p>
      <p style={{ ...rowSt, marginBottom: 6 }}><span style={labelSt}>Miembros:</span></p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {members.length ? members.map((m) => (
          <span key={m.id} style={{ background: T.accentPale, color: T.accent, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{m.name}</span>
        )) : <span style={{ color: T.textMuted, fontSize: 12 }}>Sin miembros</span>}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
        <button onClick={onClose} style={{ background: T.bgPage, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "9px 18px", color: T.textSecondary, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Cerrar</button>
      </div>
    </div>
  );
}

function UserFormModal({ user, teams, onClose, onSuccess }) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    name:     user?.name || "",
    email:    user?.email || "",
    password: "",
    role:     user?.role || "user",
    teamId:   teams.find((t) => t.memberIds?.includes(user?.id))?.id || "",
  });
  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "El nombre es requerido";
    if (!form.email.includes("@")) e.email = "Ingresa un correo válido";
    if (!isEdit && form.password.length < 6) e.password = "Mínimo 6 caracteres";
    if (!isEdit) {
      const existing = null;
      if (existing) e.email = "Este correo ya está registrado";
    }
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    if (isEdit) {
      const updates = { name: form.name.trim(), email: form.email.trim().toLowerCase(), role: form.role, avatar: getInitials(form.name) };
      if (form.password) updates.password = isBackendEnabled() ? form.password : hashPassword(form.password);
      await usersApi.update(user.id, updates);

      // Handle team change
      const oldTeam = teams.find((t) => t.memberIds?.includes(user.id));
      if (oldTeam && oldTeam.id !== form.teamId) {
        await teamsApi.removeMember(oldTeam.id, user.id);
      }
      if (form.teamId && (!oldTeam || oldTeam.id !== form.teamId)) {
        await teamsApi.addMember(form.teamId, user.id);
      }
      await usersApi.update(user.id, { teamId: form.teamId || null });
      onSuccess("Usuario actualizado exitosamente");
    } else {
      const newUser = await usersApi.create({
        name:     form.name.trim(),
        email:    form.email.trim().toLowerCase(),
        password: isBackendEnabled() ? form.password : hashPassword(form.password),
        role:     form.role,
        teamId:   form.teamId || null,
        avatar:   getInitials(form.name),
      });
      if (form.teamId) {
        await teamsApi.addMember(form.teamId, newUser.id);
      }
      onSuccess("Usuario creado exitosamente");
    }
  };

  const fieldSt = { marginBottom: 16 };
  const lblSt = { display: "block", marginBottom: 6, fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.09em", fontFamily: "'DM Sans', sans-serif" };
  const inputSt = { width: "100%", background: T.bgPage, border: `1.5px solid ${T.border}`, borderRadius: 9, padding: "11px 14px", color: T.textPrimary, fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" };
  const fo = (e) => (e.target.style.borderColor = T.accent);
  const bl = (e) => (e.target.style.borderColor = T.border);

  return (
    <div>
      <div style={fieldSt}>
        <label style={lblSt}>Nombre completo *</label>
        <input value={form.name} onChange={set("name")} placeholder="Ej. Juan Pérez" style={inputSt} onFocus={fo} onBlur={bl} />
        {errors.name && <p style={{ margin: "4px 0 0", fontSize: 12, color: T.danger }}>{errors.name}</p>}
      </div>

      <div style={fieldSt}>
        <label style={lblSt}>Correo electrónico *</label>
        <input type="email" value={form.email} onChange={set("email")} placeholder="user@empresa.com" style={inputSt} onFocus={fo} onBlur={bl} />
        {errors.email && <p style={{ margin: "4px 0 0", fontSize: 12, color: T.danger }}>{errors.email}</p>}
      </div>

      <div style={fieldSt}>
        <label style={lblSt}>{isEdit ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña *"}</label>
        <div style={{ position: "relative" }}>
          <input type={showPw ? "text" : "password"} value={form.password} onChange={set("password")} placeholder={isEdit ? "Sin cambios" : "Mínimo 6 caracteres"} style={{ ...inputSt, paddingRight: 42 }} onFocus={fo} onBlur={bl} />
          <button type="button" onClick={() => setShowPw((s) => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T.textMuted, cursor: "pointer", padding: 0, display: "flex" }}>
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        {errors.password && <p style={{ margin: "4px 0 0", fontSize: 12, color: T.danger }}>{errors.password}</p>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        <div>
          <label style={lblSt}>Rol</label>
          <select value={form.role} onChange={set("role")} style={{ ...inputSt, cursor: "pointer" }} onFocus={fo} onBlur={bl}>
            <option value="user">Usuario</option>
            <option value="supervisor">Supervisor</option>
            <option value="support">Soporte</option>
          </select>
        </div>
        <div>
          <label style={lblSt}>Equipo</label>
          <select value={form.teamId} onChange={set("teamId")} style={{ ...inputSt, cursor: "pointer" }} onFocus={fo} onBlur={bl}>
            <option value="">Sin equipo</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 8 }}>
        <button onClick={onClose} style={{ background: T.bgPage, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "10px 20px", color: T.textSecondary, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Cancelar</button>
        <button onClick={handleSubmit} style={{ background: `linear-gradient(135deg, ${T.accent} 0%, ${T.accentLight} 100%)`, color: T.white, border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", boxShadow: "0 2px 10px rgba(30,91,181,0.25)" }}>
          {isEdit ? "Guardar Cambios" : "Crear Usuario"}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════ TEAM FORM MODAL ══════════════════════ */
void UserFormModal;

function UserInventoryFormModal({ user, users, teams, currentUser, onClose, onSuccess }) {
  const isEdit = !!user;
  const [inventoryItems, setInventoryItems] = useState([]);
  useEffect(() => {
    let active = true;
    inventoryApi.getAll().then((items) => {
      if (active) setInventoryItems(Array.isArray(items) ? items : []);
    }).catch(() => {
      if (active) setInventoryItems([]);
    });
    return () => { active = false; };
  }, []);

  const existingInventory = user ? inventoryItems.find((item) => item.assignedUserId === user.id) : null;
  const selectableInventory = inventoryItems.filter((item) => !item.assignedUserId || item.assignedUserId === user?.id);
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    password: "",
    role: user?.role || "user",
    teamId: teams.find((t) => t.memberIds?.includes(user?.id))?.id || "",
    equipmentId: existingInventory?.id || "",
  });
  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const effectiveEquipmentId = form.equipmentId || existingInventory?.id || "";

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "El nombre es requerido";
    if (!form.email.includes("@")) e.email = "Ingresa un correo valido";
    if (!isEdit && form.password.length < 6) e.password = "Minimo 6 caracteres";
    if (!isEdit) {
      const existing = users.find((u) => u.email === form.email.trim().toLowerCase());
      if (existing) e.email = "Este correo ya esta registrado";
    }
    return e;
  };

  const syncAssignedInventoryLocal = async (userId) => {
    const assignedItem = inventoryItems.find((item) => item.assignedUserId === userId);
    if (assignedItem && assignedItem.id !== effectiveEquipmentId) {
      await inventoryApi.update(assignedItem.id, { assignedUserId: null });
    }
    if (effectiveEquipmentId) {
      await inventoryApi.update(effectiveEquipmentId, { assignedUserId: userId });
    }
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    if (isBackendEnabled()) {
      if (isEdit) {
        const payload = {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          role: form.role,
          avatar: getInitials(form.name),
          teamId: form.teamId || null,
          equipmentId: effectiveEquipmentId || null,
        };
        if (form.password) payload.password = form.password;
        await usersApi.update(user.id, payload);
        logAuditEntry({
          actorId: currentUser.id,
          actorName: currentUser.name,
          action: "actualizacion",
          entityType: "usuario",
          entityId: user.id,
          summary: `Usuario actualizado: ${form.name.trim()}`,
          details: `Correo: ${form.email.trim().toLowerCase()} · Rol: ${form.role}`,
        });
        onSuccess("Usuario actualizado exitosamente");
        return;
      }

      const created = await usersApi.create({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
        teamId: form.teamId || null,
        equipmentId: effectiveEquipmentId || null,
        avatar: getInitials(form.name),
      });
      logAuditEntry({
        actorId: currentUser.id,
        actorName: currentUser.name,
        action: "creacion",
        entityType: "usuario",
        entityId: created?.id,
        summary: `Usuario creado: ${form.name.trim()}`,
        details: `Correo: ${form.email.trim().toLowerCase()} · Rol: ${form.role}`,
      });
      onSuccess("Usuario creado exitosamente");
      return;
    }

    if (isEdit) {
      const updates = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        avatar: getInitials(form.name),
      };
      if (form.password) updates.password = isBackendEnabled() ? form.password : hashPassword(form.password);
      await usersApi.update(user.id, updates);

      const oldTeam = teams.find((t) => t.memberIds?.includes(user.id));
      if (oldTeam && oldTeam.id !== form.teamId) {
        await teamsApi.removeMember(oldTeam.id, user.id);
      }
      if (form.teamId && (!oldTeam || oldTeam.id !== form.teamId)) {
        await teamsApi.addMember(form.teamId, user.id);
      }
      await usersApi.update(user.id, { teamId: form.teamId || null });
      await syncAssignedInventoryLocal(user.id);
      logAuditEntry({
        actorId: currentUser.id,
        actorName: currentUser.name,
        action: "actualizacion",
        entityType: "usuario",
        entityId: user.id,
        summary: `Usuario actualizado: ${form.name.trim()}`,
        details: `Correo: ${form.email.trim().toLowerCase()} · Rol: ${form.role}`,
      });
      onSuccess("Usuario actualizado exitosamente");
      return;
    }

      const newUser = await usersApi.create({
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
        password: isBackendEnabled() ? form.password : hashPassword(form.password),
      role: form.role,
      teamId: form.teamId || null,
      avatar: getInitials(form.name),
    });
    if (form.teamId) {
        await teamsApi.addMember(form.teamId, newUser.id);
    }
    await syncAssignedInventoryLocal(newUser.id);
    logAuditEntry({
      actorId: currentUser.id,
      actorName: currentUser.name,
      action: "creacion",
      entityType: "usuario",
      entityId: newUser.id,
      summary: `Usuario creado: ${form.name.trim()}`,
      details: `Correo: ${form.email.trim().toLowerCase()} · Rol: ${form.role}`,
    });
    onSuccess("Usuario creado exitosamente");
  };

  const fieldSt = { marginBottom: 16 };
  const lblSt = {
    display: "block",
    marginBottom: 6,
    fontSize: 11,
    fontWeight: 700,
    color: T.textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.09em",
    fontFamily: "'DM Sans', sans-serif",
  };
  const inputSt = {
    width: "100%",
    background: T.bgPage,
    border: `1.5px solid ${T.border}`,
    borderRadius: 9,
    padding: "11px 14px",
    color: T.textPrimary,
    fontSize: 13,
    fontFamily: "'DM Sans', sans-serif",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  };
  const fo = (e) => (e.target.style.borderColor = T.accent);
  const bl = (e) => (e.target.style.borderColor = T.border);

  return (
    <div>
      <div style={fieldSt}>
        <label style={lblSt}>Nombre completo *</label>
        <input value={form.name} onChange={set("name")} placeholder="Ej. Juan Perez" style={inputSt} onFocus={fo} onBlur={bl} />
        {errors.name && <p style={{ margin: "4px 0 0", fontSize: 12, color: T.danger }}>{errors.name}</p>}
      </div>

      <div style={fieldSt}>
        <label style={lblSt}>Correo electronico *</label>
        <input type="email" value={form.email} onChange={set("email")} placeholder="user@empresa.com" style={inputSt} onFocus={fo} onBlur={bl} />
        {errors.email && <p style={{ margin: "4px 0 0", fontSize: 12, color: T.danger }}>{errors.email}</p>}
      </div>

      <div style={fieldSt}>
        <label style={lblSt}>{isEdit ? "Nueva contrasena (dejar vacio para no cambiar)" : "Contrasena *"}</label>
        <div style={{ position: "relative" }}>
          <input type={showPw ? "text" : "password"} value={form.password} onChange={set("password")} placeholder={isEdit ? "Sin cambios" : "Minimo 6 caracteres"} style={{ ...inputSt, paddingRight: 42 }} onFocus={fo} onBlur={bl} />
          <button type="button" onClick={() => setShowPw((s) => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T.textMuted, cursor: "pointer", padding: 0, display: "flex" }}>
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        {errors.password && <p style={{ margin: "4px 0 0", fontSize: 12, color: T.danger }}>{errors.password}</p>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        <div>
          <label style={lblSt}>Rol</label>
          <select value={form.role} onChange={set("role")} style={{ ...inputSt, cursor: "pointer" }} onFocus={fo} onBlur={bl}>
            <option value="user">Usuario</option>
            <option value="supervisor">Supervisor</option>
            <option value="support">Soporte</option>
          </select>
        </div>
        <div>
          <label style={lblSt}>Equipo</label>
          <select value={form.teamId} onChange={set("teamId")} style={{ ...inputSt, cursor: "pointer" }} onFocus={fo} onBlur={bl}>
            <option value="">Sin equipo</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 20, padding: 18, borderRadius: 12, background: "#f8fbff", border: `1px solid ${T.border}` }}>
        <div style={{ marginBottom: 12 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: T.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>Equipo de Cómputo (Inventario)</p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: T.textSecondary, fontFamily: "'DM Sans', sans-serif" }}>
            Selecciona un equipo ya registrado en inventario. No se crean equipos desde este formulario.
          </p>
        </div>

        <div style={fieldSt}>
          <label style={lblSt}>Equipo asignado (opcional)</label>
          <select value={effectiveEquipmentId} onChange={set("equipmentId")} style={{ ...inputSt, cursor: "pointer" }} onFocus={fo} onBlur={bl}>
            <option value="">Sin equipo asignado</option>
            {selectableInventory.map((item) => (
              <option key={item.id} value={item.id}>
                {(item.assetName || "Equipo")} - {item.serialNumber || "Sin serie"}
              </option>
            ))}
          </select>
          {errors.equipmentId && <p style={{ margin: "4px 0 0", fontSize: 12, color: T.danger }}>{errors.equipmentId}</p>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 8 }}>
        <button onClick={onClose} style={{ background: T.bgPage, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "10px 20px", color: T.textSecondary, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Cancelar</button>
        <button onClick={handleSubmit} style={{ background: `linear-gradient(135deg, ${T.accent} 0%, ${T.accentLight} 100%)`, color: T.white, border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", boxShadow: "0 2px 10px rgba(30,91,181,0.25)" }}>
          {isEdit ? "Guardar Cambios" : "Crear Usuario"}
        </button>
      </div>
    </div>
  );
}

function TeamFormModal({ users, currentUser, onClose, onSuccess }) {
  const [form, setForm] = useState({ name: "", supervisorIds: [] });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const supervisors = users.filter((u) => u.role === "supervisor");
  const toggleSupervisor = (userId) => {
    setForm((prev) => ({
      ...prev,
      supervisorIds: prev.supervisorIds.includes(userId)
        ? prev.supervisorIds.filter((id) => id !== userId)
        : [...prev.supervisorIds, userId],
    }));
  };

  const handleSubmit = async () => {
    const validSupervisorIds = Array.from(
      new Set(
        (form.supervisorIds || []).filter((id) => users.find((u) => u.id === id)?.role === "supervisor")
      )
    );
    const e = {};
    if (!form.name.trim()) e.name = "El nombre es requerido";
    if (!validSupervisorIds.length) e.supervisorIds = "Selecciona al menos un supervisor";
    if (Object.keys(e).length) { setErrors(e); return; }

    const conflicting = validSupervisorIds.find((supId) => {
      const supervisor = users.find((u) => u.id === supId);
      return supervisor?.teamId;
    });
    if (conflicting) {
      setErrors({ supervisorIds: "Un supervisor seleccionado ya pertenece a otro equipo." });
      return;
    }

    const nextMemberIds = Array.from(new Set(validSupervisorIds));
    const team = await teamsApi.create({
      name: form.name.trim(),
      supervisorIds: validSupervisorIds,
      memberIds: nextMemberIds,
    });
    logAuditEntry({
      actorId: currentUser.id,
      actorName: currentUser.name,
      action: "creacion",
      entityType: "equipo",
      entityId: team.id,
      summary: `Equipo creado: ${team.name}`,
      details: `Supervisores: ${validSupervisorIds.join(", ")}`,
    });

    onSuccess(`Equipo "${team.name}" creado exitosamente`);
  };

  const lblSt = { display: "block", marginBottom: 6, fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.09em", fontFamily: "'DM Sans', sans-serif" };
  const inputSt = { width: "100%", background: T.bgPage, border: `1.5px solid ${T.border}`, borderRadius: 9, padding: "11px 14px", color: T.textPrimary, fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" };
  const fo = (e) => (e.target.style.borderColor = T.accent);
  const bl = (e) => (e.target.style.borderColor = T.border);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <label style={lblSt}>Nombre del equipo *</label>
        <input value={form.name} onChange={set("name")} placeholder="Ej. Equipo Desarrollo" style={inputSt} onFocus={fo} onBlur={bl} />
        {errors.name && <p style={{ margin: "4px 0 0", fontSize: 12, color: T.danger }}>{errors.name}</p>}
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={lblSt}>Supervisores *</label>
        <div style={{ display: "grid", gap: 8, maxHeight: 220, overflowY: "auto", padding: 12, border: `1px solid ${T.border}`, borderRadius: 10, background: "#f8fbff" }}>
          <option value="">Seleccionar supervisor…</option>
          {supervisors.map((u) => {
            const locked = Boolean(u.teamId) && !form.supervisorIds.includes(u.id);
            return (
              <label key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: locked ? "not-allowed" : "pointer", color: locked ? "#9ca3af" : T.textPrimary, fontSize: 13 }}>
                <input type="checkbox" checked={form.supervisorIds.includes(u.id)} disabled={locked} onChange={() => !locked && toggleSupervisor(u.id)} />
                <span>{u.name}</span>
                <span style={{ fontSize: 11, color: T.textMuted }}>
                  {locked ? "Asignado a otro equipo" : (u.role === "support" ? "Soporte" : "Supervisor")}
                </span>
              </label>
            );
          })}
        </div>
        {errors.supervisorIds && <p style={{ margin: "4px 0 0", fontSize: 12, color: T.danger }}>{errors.supervisorIds}</p>}
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 8 }}>
        <button onClick={onClose} style={{ background: T.bgPage, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "10px 20px", color: T.textSecondary, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Cancelar</button>
        <button onClick={handleSubmit} style={{ background: `linear-gradient(135deg, ${T.accent} 0%, ${T.accentLight} 100%)`, color: T.white, border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", boxShadow: "0 2px 10px rgba(30,91,181,0.25)" }}>
          Crear Equipo
        </button>
      </div>
    </div>
  );
}

function TeamEditModal({ team, users, currentUser, onClose, onSuccess }) {
  const teamSupervisorIds = team?.supervisorIds || (team?.supervisorId ? [team.supervisorId] : []);
  const [form, setForm] = useState({
    name: team?.name || "",
    supervisorIds: teamSupervisorIds,
    memberIds: team?.memberIds || [],
  });
  const [errors, setErrors] = useState({});
  const eligibleUsers = users.filter((user) => user.role === "user");
  const supervisors = users.filter((u) => u.role === "supervisor");

  const toggleSupervisor = (userId) => {
    setForm((prev) => ({
      ...prev,
      supervisorIds: prev.supervisorIds.includes(userId)
        ? prev.supervisorIds.filter((id) => id !== userId)
        : [...prev.supervisorIds, userId],
    }));
  };

  const toggleMember = (userId) => {
    const existingUser = users.find((u) => u.id === userId);
    if (existingUser?.teamId && existingUser.teamId !== team.id) {
      setErrors({ memberConflict: "Este usuario ya pertenece a otro equipo." });
      return;
    }
    setForm((prev) => ({
      ...prev,
      memberIds: prev.memberIds.includes(userId)
        ? prev.memberIds.filter((id) => id !== userId)
        : [...prev.memberIds, userId],
    }));
  };

  const handleSubmit = async () => {
    const validSupervisorIds = Array.from(
      new Set(
        (form.supervisorIds || []).filter((id) => users.find((u) => u.id === id)?.role === "supervisor")
      )
    );
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "El nombre es requerido";
    if (!validSupervisorIds.length) nextErrors.supervisorIds = "Selecciona al menos un supervisor";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    const nextMemberIds = Array.from(
      new Set((form.memberIds || []).filter((id) => users.find((u) => u.id === id)?.role !== "support"))
    );
    // validar que nadie pertenezca a otro equipo
    const conflict = nextMemberIds.find((userId) => {
      const existingUser = users.find((u) => u.id === userId);
      return existingUser?.teamId && existingUser.teamId !== team.id;
    });
    if (conflict) {
      setErrors({ memberConflict: "Un miembro ya está asignado a otro equipo." });
      return;
    }

    const supervisorConflict = validSupervisorIds.find((supId) => {
      const existingUser = users.find((u) => u.id === supId);
      return existingUser?.teamId && existingUser.teamId !== team.id;
    });
    if (supervisorConflict) {
      setErrors({ supervisorIds: "Un supervisor ya está asignado a otro equipo." });
      return;
    }

    validSupervisorIds.forEach((supId) => {
      if (!nextMemberIds.includes(supId)) {
        nextMemberIds.push(supId);
      }
    });

    await teamsApi.update(team.id, {
      name: form.name.trim(),
      supervisorIds: validSupervisorIds,
      memberIds: nextMemberIds,
    });

    logAuditEntry({
      actorId: currentUser.id,
      actorName: currentUser.name,
      action: "actualizacion",
      entityType: "equipo",
      entityId: team.id,
      summary: `Equipo actualizado: ${form.name.trim()}`,
      details: `Miembros actuales: ${nextMemberIds.length}`,
    });

    onSuccess(`Equipo "${form.name.trim()}" actualizado exitosamente`);
  };

  const lblSt = { display: "block", marginBottom: 6, fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.09em", fontFamily: "'DM Sans', sans-serif" };
  const inputSt = { width: "100%", background: T.bgPage, border: `1.5px solid ${T.border}`, borderRadius: 9, padding: "11px 14px", color: T.textPrimary, fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" };
  const fo = (e) => (e.target.style.borderColor = T.accent);
  const bl = (e) => (e.target.style.borderColor = T.border);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <label style={lblSt}>Nombre del equipo *</label>
        <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Ej. Equipo Desarrollo" style={inputSt} onFocus={fo} onBlur={bl} />
        {errors.name && <p style={{ margin: "4px 0 0", fontSize: 12, color: T.danger }}>{errors.name}</p>}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={lblSt}>Supervisores *</label>
        <div style={{ display: "grid", gap: 8, maxHeight: 220, overflowY: "auto", padding: 12, border: `1px solid ${T.border}`, borderRadius: 10, background: "#f8fbff" }}>
          <option value="">Seleccionar supervisor…</option>
          {supervisors.map((u) => {
            const locked = Boolean(u.teamId) && u.teamId !== team.id && !form.supervisorIds.includes(u.id);
            return (
              <label key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: locked ? "not-allowed" : "pointer", color: locked ? "#9ca3af" : T.textPrimary, fontSize: 13 }}>
                <input type="checkbox" checked={form.supervisorIds.includes(u.id)} onChange={() => !locked && toggleSupervisor(u.id)} disabled={locked} />
                <span>{u.name}</span>
                <span style={{ fontSize: 11, color: T.textMuted }}>{locked ? "Asignado a otro equipo" : u.email}</span>
              </label>
            );
          })}
        </div>
        {errors.supervisorIds && <p style={{ margin: "4px 0 0", fontSize: 12, color: T.danger }}>{errors.supervisorIds}</p>}
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={lblSt}>Usuarios asignados</label>
        <div style={{ display: "grid", gap: 8, maxHeight: 260, overflowY: "auto", padding: 12, border: `1px solid ${T.border}`, borderRadius: 10, background: "#f8fbff" }}>
          {eligibleUsers.map((user) => {
            const locked = Boolean(user.teamId) && user.teamId !== team.id;
            return (
              <label key={user.id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: locked ? "not-allowed" : "pointer", color: locked ? "#9ca3af" : T.textPrimary, fontSize: 13 }}>
                <input type="checkbox" checked={form.memberIds.includes(user.id)} onChange={() => !locked && toggleMember(user.id)} disabled={locked} />
                <span>{user.name}</span>
                <span style={{ fontSize: 11, color: T.textMuted }}>{locked ? `Asignado a otro equipo` : user.email}</span>
              </label>
            );
          })}
          {errors.memberConflict && <p style={{ margin: 0, fontSize: 12, color: T.danger }}>{errors.memberConflict}</p>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 8 }}>
        <button onClick={onClose} style={{ background: T.bgPage, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "10px 20px", color: T.textSecondary, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Cancelar</button>
        <button onClick={handleSubmit} style={{ background: `linear-gradient(135deg, ${T.accent} 0%, ${T.accentLight} 100%)`, color: T.white, border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", boxShadow: "0 2px 10px rgba(30,91,181,0.25)" }}>
          Guardar Cambios
        </button>
      </div>
    </div>
  );
}








