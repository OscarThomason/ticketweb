import { useEffect, useState, useMemo } from "react";
import {
  Ticket, AlertCircle, Clock, CheckCircle2,
  Plus, ChevronRight, FileText, User, Download,
} from "lucide-react";
import { useAuth } from "../../../../app/providers/auth-context.js";
import { useTicketsByUser } from "../../../../services/tickets/hooks/use-tickets.js";
import TicketDetail from "../TicketDetail.jsx";
import TicketForm from "../../../../services/tickets/components/TicketForm.jsx";
import Modal from "../../../../shared/components/Modal.jsx";
import Toast from "../../../../shared/components/Toast.jsx";
import NotificationsBell from "../../../../shared/components/NotificationsBell.jsx";
import { useResponsive } from "../../../../shared/hooks/use-responsive.js";
import {
  applyFilters,
  defaultFilters,
  groupByMonth,
  STATUSES,
  PRIORITIES,
  CATEGORIES,
  ACTIVITY_OPTIONS,
} from "../../../../shared/utils/tickets.js";
import { exportTicketsToCsv } from "../../../../shared/utils/export-history.js";
import { getTicketDisplayId } from "../../../../shared/utils/tickets.js";

const T = {
  bgPage: "#f0f6ff",
  bgCard: "#ffffff",
  bgHeader: "linear-gradient(135deg, #1a3a6e 0%, #1e5bb5 100%)",
  bgTabBar: "#e8f0fe",
  border: "#cce0ff",
  borderStrong: "#93c5fd",
  accent: "#1e5bb5",
  accentLight: "#4a90d9",
  accentSky: "#7ab8f5",
  accentPale: "#dbeafe",
  textPrimary: "#0f2a5e",
  textSecondary: "#4a6fa5",
  textMuted: "#8aafd4",
  white: "#ffffff",
  danger: "#dc2626",
  dangerPale: "#fef2f2",
  warning: "#d97706",
  warningPale: "#fffbeb",
  success: "#059669",
  successPale: "#f0fdf4",
  purple: "#7c3aed",
  purplePale: "#faf5ff",
};

const STATUS_STYLES = {
  Abierto: { color: T.danger, bg: T.dangerPale, border: "#fecaca" },
  "En Proceso": { color: T.warning, bg: T.warningPale, border: "#fde68a" },
  Cerrado: { color: T.success, bg: T.successPale, border: "#bbf7d0" },
  Aplazado: { color: T.purple, bg: T.purplePale, border: "#ddd6fe" },
};

const PRIORITY_STYLES = {
  Baja: { color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0" },
  Media: { color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
  Alta: { color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  "Crítica": { color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
};

function Pill({ label, map }) {
  const s = map[label] || { color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0" };
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        borderRadius: 5,
        padding: "2px 10px",
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "'DM Sans', sans-serif",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function KpiCard({ label, value, icon, color, bg, onClick }) {
  const IconComponent = icon;

  return (
    <div
      onClick={onClick}
      style={{
        background: T.bgCard,
        borderRadius: 12,
        padding: "18px 20px",
        border: `1px solid ${T.border}`,
        borderTop: `3px solid ${color}`,
        boxShadow: "0 2px 10px rgba(30,91,181,0.07)",
        position: "relative",
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 8px 20px rgba(30,91,181,0.15)";
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = "none";
          e.currentTarget.style.boxShadow = "0 2px 10px rgba(30,91,181,0.07)";
        }
      }}
    >
      <div style={{ position: "absolute", right: -8, bottom: -8, opacity: 0.06 }}>
        <IconComponent size={72} color={color} />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: T.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {label}
        </span>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconComponent size={15} color={color} strokeWidth={2.2} />
        </div>
      </div>
      <div
        style={{
          fontSize: 36,
          fontWeight: 700,
          color: T.textPrimary,
          fontFamily: "var(--font-metric)",
          letterSpacing: "-0.04em",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Tab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? T.bgCard : "transparent",
        color: active ? T.accent : T.textSecondary,
        border: "none",
        padding: "8px 20px",
        borderRadius: 7,
        cursor: "pointer",
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        fontFamily: "'DM Sans', sans-serif",
        transition: "all 0.2s",
        boxShadow: active ? "0 1px 6px rgba(30,91,181,0.14)" : "none",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function LightFilters({ filters, setFilters }) {
  const inputStyle = {
    background: T.bgPage,
    border: `1.5px solid ${T.border}`,
    borderRadius: 8,
    padding: "9px 14px",
    color: T.textPrimary,
    fontSize: 13,
    fontFamily: "'DM Sans', sans-serif",
    outline: "none",
    cursor: "pointer",
    transition: "border-color 0.2s",
  };

  const handleFocus = (e) => {
    e.target.style.borderColor = T.accent;
  };

  const handleBlur = (e) => {
    e.target.style.borderColor = T.border;
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        padding: "16px 24px",
        borderBottom: `1px solid ${T.border}`,
        background: T.bgPage,
      }}
    >
      <div style={{ flex: 1, minWidth: 180, position: "relative" }}>
        <svg
          style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }}
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke={T.textMuted}
          strokeWidth="2.5"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          placeholder="Buscar tickets..."
          value={filters.search}
          onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          style={{ ...inputStyle, width: "100%", paddingLeft: 32, boxSizing: "border-box" }}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </div>
      {[
        { key: "status", opts: ["Todos", ...STATUSES] },
        { key: "priority", opts: ["Todas", ...PRIORITIES], label: "Prioridad" },
        { key: "activity", opts: ["Todas", ...ACTIVITY_OPTIONS], label: "¿Impide?" },
        { key: "category", opts: ["Todas", ...CATEGORIES] },
      ].map(({ key, opts, label }) => (
        <select
          key={key}
          value={filters[key]}
          onChange={(e) => setFilters((prev) => ({ ...prev, [key]: e.target.value }))}
          style={inputStyle}
          onFocus={handleFocus}
          onBlur={handleBlur}
        >
          {label && (
            <option disabled value="">
              {label}
            </option>
          )}
          {opts.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      ))}
    </div>
  );
}

function LightTicketTable({ tickets, onSelect }) {
  const { isMobile } = useResponsive();
  const isBlockingActivity = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim() === "si";

  if (tickets.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "56px 20px" }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: T.accentPale,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 14px",
          }}
        >
          <FileText size={26} color={T.accentLight} />
        </div>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: T.textPrimary, fontFamily: "'Syne', sans-serif" }}>
          Sin tickets
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: T.textMuted }}>
          Crea tu primer ticket con el botón de arriba
        </p>
      </div>
    );
  }

  const thStyle = {
    padding: "11px 16px",
    textAlign: "left",
    fontSize: 11,
    fontWeight: 700,
    color: T.textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontFamily: "'DM Sans', sans-serif",
    background: T.bgPage,
    borderBottom: `1.5px solid ${T.border}`,
    whiteSpace: "nowrap",
  };

  if (isMobile) {
    return (
      <div style={{ display: "grid", gap: 12, padding: 12 }}>
        {tickets.map((ticket) => {
          const blocking = isBlockingActivity(ticket.activity);
          return (
            <button
              key={ticket.id}
              type="button"
              onClick={() => onSelect(ticket.id)}
              style={{
                background: T.white,
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                padding: 14,
                textAlign: "left",
                cursor: "pointer",
                boxShadow: "0 2px 10px rgba(30,91,181,0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "flex-start",
                  marginBottom: 10,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: T.accentLight,
                      fontFamily: "monospace",
                      marginBottom: 6,
                    }}
                  >
                    {getTicketDisplayId(ticket)}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>{ticket.title}</div>
                </div>
                <ChevronRight size={16} color={T.accentLight} style={{ flexShrink: 0 }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase" }}>
                    Categoría
                  </div>
                  <div style={{ fontSize: 12, color: T.textSecondary }}>{ticket.category}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase" }}>
                    Fecha
                  </div>
                  <div style={{ fontSize: 12, color: T.textSecondary }}>
                    {new Date(ticket.createdAt).toLocaleDateString("es-MX", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <Pill label={ticket.priority} map={PRIORITY_STYLES} />
                <Pill label={ticket.status} map={STATUS_STYLES} />
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: T.textSecondary }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      display: "inline-block",
                      background: blocking ? T.danger : T.success,
                      boxShadow: `0 0 0 2px ${blocking ? T.dangerPale : T.successPale}`,
                    }}
                  />
                  {blocking ? "Impide trabajar" : "No impide trabajar"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            <th style={thStyle}>ID</th>
            <th style={thStyle}>Título</th>
            <th style={thStyle}>Categoría</th>
            <th style={thStyle}>Actividad</th>
            <th style={thStyle}>Prioridad</th>
            <th style={thStyle}>Estado</th>
            <th style={thStyle}>Fecha</th>
            <th style={thStyle}></th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket, index) => (
            <tr
              key={ticket.id}
              style={{
                borderBottom: `1px solid ${T.border}`,
                cursor: "pointer",
                transition: "background 0.15s",
                background: index % 2 === 0 ? T.white : "#fafcff",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = T.accentPale;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = index % 2 === 0 ? T.white : "#fafcff";
              }}
              onClick={() => onSelect(ticket.id)}
            >
              <td style={{ padding: "13px 16px" }}>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.accentLight,
                    background: T.accentPale,
                    padding: "2px 7px",
                    borderRadius: 4,
                  }}
                >
                  {getTicketDisplayId(ticket)}
                </span>
              </td>
              <td style={{ padding: "13px 16px", maxWidth: 260 }}>
                <span
                  style={{
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontWeight: 600,
                    color: T.textPrimary,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {ticket.title}
                </span>
              </td>
              <td style={{ padding: "13px 16px" }}>
                <span style={{ fontSize: 12, color: T.textSecondary, fontWeight: 500 }}>{ticket.category}</span>
              </td>
              <td style={{ padding: "13px 16px" }}>
                {(() => {
                  const blocking = isBlockingActivity(ticket.activity);
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
              <td style={{ padding: "13px 16px" }}>
                <Pill label={ticket.priority} map={PRIORITY_STYLES} />
              </td>
              <td style={{ padding: "13px 16px" }}>
                <Pill label={ticket.status} map={STATUS_STYLES} />
              </td>
              <td style={{ padding: "13px 16px" }}>
                <span style={{ fontSize: 12, color: T.textMuted, fontFamily: "monospace" }}>
                  {new Date(ticket.createdAt).toLocaleDateString("es-MX", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </td>
              <td style={{ padding: "13px 16px" }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    background: T.accentPale,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
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

export default function UserDashboard() {
  const { currentUser } = useAuth();
  const { isMobile } = useResponsive();
  const { data: tickets = [], refetch } = useTicketsByUser(currentUser.id);

  const [view, setView] = useState("tickets");
  const [filters, setFilters] = useState(defaultFilters);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState(null);

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

  const filtered = useMemo(() => applyFilters(tickets, filters), [tickets, filters]);

  const stats = useMemo(
    () => ({
      total: tickets.length,
      abierto: tickets.filter((ticket) => ticket.status === "Abierto").length,
      enProceso: tickets.filter((ticket) => ticket.status === "En Proceso").length,
      cerrado: tickets.filter((ticket) => ticket.status === "Cerrado").length,
    }),
    [tickets],
  );

  const handleKpiClick = (status) => {
    setFilters((prev) => ({ ...prev, status: status || "Todos" }));
    if (status) {
      setView("tickets");
    }
    setTimeout(() => {
      document.getElementById("ticket-list-area")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const currentDate = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handleExportHistory = () => {
    exportTicketsToCsv(
      filtered,
      [{ id: currentUser.id, name: currentUser.name }],
      [],
      `historial-${currentUser.name.toLowerCase().replace(/\s+/g, "-")}.xlsx`,
    );
  };

  return (
    <div
      style={{
        background: T.bgPage,
        minHeight: "100vh",
        fontFamily: "'DM Sans', sans-serif",
        padding: isMobile ? 12 : 20,
      }}
    >
      <div
        style={{
          background: T.bgHeader,
          borderRadius: 16,
          padding: isMobile ? "18px 16px" : "26px 32px",
          marginBottom: 28,
          color: T.white,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          boxShadow: "0 4px 24px rgba(30,91,181,0.25)",
          position: "relative",
          overflow: "visible",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -30,
            top: -30,
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 100,
            bottom: -50,
            width: 130,
            height: 130,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.04)",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(255,255,255,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <User size={18} color={T.white} />
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 800,
                fontFamily: "'DM Sans', sans-serif",
                letterSpacing: "-0.02em",
              }}
            >
              Mis Tickets
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.75 }}>
            Bienvenido, {currentUser.name} &nbsp;·&nbsp;
            <span style={{ textTransform: "capitalize" }}>{currentDate}</span>
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative", zIndex: 1 }}>
          <NotificationsBell compact={isMobile} />
          <button
            onClick={() => setShowCreate(true)}
            style={{
              background: T.white,
              color: T.accent,
              border: "none",
              borderRadius: 10,
              padding: "11px 22px",
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "'DM Sans', sans-serif",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.15)";
            }}
          >
            <Plus size={16} strokeWidth={2.5} /> Nuevo Ticket
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <KpiCard
          label="Total"
          value={stats.total}
          icon={Ticket}
          color={T.accent}
          bg={T.accentPale}
          onClick={() => handleKpiClick(null)}
        />
        <KpiCard
          label="Abiertos"
          value={stats.abierto}
          icon={AlertCircle}
          color={T.danger}
          bg={T.dangerPale}
          onClick={() => handleKpiClick("Abierto")}
        />
        <KpiCard
          label="En Proceso"
          value={stats.enProceso}
          icon={Clock}
          color={T.warning}
          bg={T.warningPale}
          onClick={() => handleKpiClick("En Proceso")}
        />
        <KpiCard
          label="Cerrados"
          value={stats.cerrado}
          icon={CheckCircle2}
          color={T.success}
          bg={T.successPale}
          onClick={() => handleKpiClick("Cerrado")}
        />
      </div>

      <div
        id="ticket-list-area"
        style={{
          background: T.bgCard,
          borderRadius: 14,
          border: `1px solid ${T.border}`,
          overflow: "hidden",
          boxShadow: "0 2px 12px rgba(30,91,181,0.06)",
        }}
      >
        <div
          style={{
            padding: "16px 24px",
            background: T.bgPage,
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: 4, background: T.bgTabBar, borderRadius: 9, padding: 4 }}>
            <Tab
              label="Mis Tickets"
              active={view === "tickets"}
              onClick={() => {
                setView("tickets");
                setFilters(defaultFilters);
              }}
            />
            <Tab
              label="Historial"
              active={view === "historial"}
              onClick={() => {
                setView("historial");
                setFilters(defaultFilters);
              }}
            />
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            {view === "historial" && (
              <button
                onClick={handleExportHistory}
                style={{
                  background: T.white,
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  padding: "8px 12px",
                  color: T.accent,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Download size={14} /> Exportar Excel
              </button>
            )}
            <span style={{ fontSize: 12, color: T.textMuted }}>
              {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <LightFilters filters={filters} setFilters={setFilters} />

        {view === "historial" ? (
          <div style={{ padding: "16px 24px" }}>
            {Object.keys(groupByMonth(filtered)).length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <p style={{ margin: 0, fontSize: 14, color: T.textMuted }}>No hay tickets en el historial</p>
              </div>
            ) : (
              Object.entries(groupByMonth(filtered)).map(([month, monthTickets]) => (
                <div key={month} style={{ marginBottom: 28 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: T.accent,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {month}
                    </span>
                    <div style={{ flex: 1, height: 1, background: T.border }} />
                    <span style={{ fontSize: 11, color: T.textMuted, fontFamily: "monospace" }}>
                      {monthTickets.length} ticket{monthTickets.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${T.border}` }}>
                    <LightTicketTable tickets={monthTickets} onSelect={setSelectedId} />
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <LightTicketTable tickets={filtered} onSelect={setSelectedId} />
        )}
      </div>

      {showCreate && (
        <Modal title="Crear Nuevo Ticket" onClose={() => setShowCreate(false)} width={560}>
          <TicketForm
            onClose={() => setShowCreate(false)}
            onSuccess={(message) => {
              setToast(message);
              refetch();
            }}
          />
        </Modal>
      )}

      {selectedId && (
        <Modal title="Detalle del Ticket" onClose={() => { setSelectedId(null); refetch(); }} width={680}>
          <TicketDetail
            ticketId={selectedId}
            canChangeStatus={false}
            canComment={false}
            onClose={() => setSelectedId(null)}
            onUpdate={refetch}
            knownUsers={[currentUser]}
          />
        </Modal>
      )}

      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
    </div>
  );
}
