import { useEffect, useState, useMemo } from "react";
import {
  Ticket, AlertCircle, Clock, AlertTriangle, Plus,
  Users, ChevronRight, TrendingUp, BarChart2, Download,
} from "lucide-react";
import { useAuth }                         from "../../../../app/providers/auth-context.js";
import { useTicketsByTeam, useTicketsByUser, useTeamBySupervisor }
  from "../../../../services/tickets/hooks/use-tickets.js";
import { FiltersBar, TicketTable }         from "../index.js";
import TicketDetail                        from "../TicketDetail.jsx";
import TicketForm                          from "../../../../services/tickets/components/TicketForm.jsx";
import Modal                               from "../../../../shared/components/Modal.jsx";
import Toast                               from "../../../../shared/components/Toast.jsx";
import NotificationsBell                   from "../../../../shared/components/NotificationsBell.jsx";
import { useResponsive }                   from "../../../../shared/hooks/use-responsive.js";
import { applyFilters, defaultFilters, groupByMonth, STATUSES, PRIORITIES, CATEGORIES, ACTIVITY_OPTIONS }
  from "../../../../shared/utils/tickets.js";
import { exportTicketsToCsv } from "../../../../shared/utils/export-history.js";
import { getTicketDisplayId } from "../../../../shared/utils/tickets.js";

/* ─── Design tokens (azul cielo · blanco · azul fuerte) ─── */
const T = {
  bgPage:       "#f0f6ff",          // fondo general azul muy suave
  bgCard:       "#ffffff",          // tarjetas blancas
  bgSidebar:    "#1a3a6e",          // azul fuerte oscuro
  bgHeader:     "linear-gradient(135deg, #1a3a6e 0%, #1e5bb5 100%)",
  bgTabBar:     "#e8f0fe",          // barra de tabs
  bgTabActive:  "#ffffff",
  accent:       "#1e5bb5",          // azul fuerte principal
  accentLight:  "#4a90d9",          // azul medio
  accentSky:    "#7ab8f5",          // azul cielo
  accentPale:   "#dbeafe",          // azul muy pálido
  border:       "#cce0ff",          // borde azul suave
  borderStrong: "#93c5fd",
  textPrimary:  "#0f2a5e",          // azul casi negro
  textSecondary:"#4a6fa5",          // azul medio
  textMuted:    "#8aafd4",          // azul claro
  white:        "#ffffff",
  danger:       "#dc2626",
  warning:      "#d97706",
  success:      "#059669",
  purple:       "#7c3aed",
};

/* ─── KPI Card ──────────────────────────────────────────── */
let supervisorCriticalKpiHandler = null;

function KpiCard({ label, value, icon, color, trend, borderTop, onClick }) {
  const IconComponent = icon;
  const clickHandler = label.includes("Cr") && supervisorCriticalKpiHandler ? supervisorCriticalKpiHandler : onClick;

  return (
    <div
      onClick={clickHandler}
      style={{
        background:   T.bgCard,
        borderRadius: 12,
        padding:      "20px 22px",
        border:       `1px solid ${T.border}`,
        borderTop:    `3px solid ${borderTop || color}`,
        boxShadow:    "0 2px 12px rgba(30,91,181,0.07)",
        position:     "relative",
        overflow:     "hidden",
        display:      "flex",
        flexDirection:"column",
        gap:          10,
        cursor:       clickHandler ? "pointer" : "default",
        transition:   "transform 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={(e) => { if (clickHandler) { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(30,91,181,0.15)"; } }}
      onMouseLeave={(e) => { if (clickHandler) { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(30,91,181,0.07)"; } }}
    >
      {/* Watermark icon */}
      <div style={{ position: "absolute", right: -8, bottom: -8, opacity: 0.05 }}>
        <IconComponent size={80} color={color} />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'DM Sans', sans-serif" }}>
          {label}
        </span>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <IconComponent size={17} color={color} strokeWidth={2.2} />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
        <span style={{ fontSize: 38, fontWeight: 700, color: T.textPrimary, fontFamily: "var(--font-metric)", letterSpacing: "-0.04em", lineHeight: 1 }}>
          {value}
        </span>
        {trend != null && (
          <span style={{ fontSize: 12, fontWeight: 600, color: T.success, marginBottom: 4, display: "flex", alignItems: "center", gap: 2 }}>
            <TrendingUp size={12} /> +{trend}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Member Badge ──────────────────────────────────────── */
function MemberBadge({ member, ticketCount, openCount, isSelf, onClick, isActive }) {
  const initials = member.avatar || member.name?.slice(0, 2).toUpperCase();
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
      background:   T.bgCard,
      border:       `1px solid ${isActive ? T.accent : isSelf ? T.accentLight : T.border}`,
      borderRadius: 10,
      padding:      "14px 16px",
      display:      "flex",
      alignItems:   "center",
      gap:          12,
      boxShadow:    isActive ? `0 0 0 2px ${T.accentPale}` : isSelf ? `0 0 0 2px ${T.accentPale}` : "0 1px 4px rgba(30,91,181,0.06)",
      cursor:       "pointer",
      width:        "100%",
      textAlign:    "left",
    }}>
      {/* Avatar */}
      <div style={{
        width:          40, height: 40, borderRadius: "50%",
        background:     isSelf ? T.accent : T.accentPale,
        display:        "flex", alignItems: "center", justifyContent: "center",
        fontSize:       14, fontWeight: 800,
        color:          isSelf ? T.white : T.accent,
        fontFamily:     "'Syne', sans-serif",
        flexShrink:     0,
        border:         `2px solid ${isSelf ? T.accentLight : T.borderStrong}`,
      }}>
        {initials}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, fontFamily: "'Syne', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {member.name}
          </span>
          {isSelf && (
            <span style={{ fontSize: 9, fontWeight: 700, background: T.accent, color: T.white, padding: "1px 6px", borderRadius: 10, letterSpacing: "0.05em", fontFamily: "monospace" }}>
              TÚ
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 3 }}>
          <span style={{ fontSize: 11, color: T.textMuted, fontFamily: "'DM Sans', sans-serif" }}>
            {ticketCount} ticket{ticketCount !== 1 ? "s" : ""}
          </span>
          {openCount > 0 && (
            <span style={{ fontSize: 11, color: T.danger, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
              · {openCount} abierto{openCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ width: 48, flexShrink: 0 }}>
        <div style={{ height: 4, background: T.accentPale, borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${ticketCount > 0 ? Math.min((openCount / ticketCount) * 100, 100) : 0}%`, background: openCount > 0 ? T.danger : T.success, borderRadius: 2, transition: "width 0.4s ease" }} />
        </div>
        <span style={{ fontSize: 9, color: T.textMuted, fontFamily: "monospace", display: "block", textAlign: "right", marginTop: 2 }}>
          {ticketCount > 0 ? Math.round((openCount / ticketCount) * 100) : 0}%
        </span>
      </div>
    </button>
  );
}

/* ─── Tab Button ────────────────────────────────────────── */
function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      background:   active ? T.bgCard : "transparent",
      color:        active ? T.accent : T.textSecondary,
      border:       "none",
      padding:      "8px 18px",
      borderRadius: 7,
      cursor:       "pointer",
      fontSize:     13,
      fontWeight:   active ? 700 : 500,
      fontFamily:   "'DM Sans', sans-serif",
      transition:   "all 0.2s",
      boxShadow:    active ? "0 1px 6px rgba(30,91,181,0.15)" : "none",
      whiteSpace:   "nowrap",
    }}>
      {label}
    </button>
  );
}

/* ─── Section title ─────────────────────────────────────── */
function SectionTitle({ children, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 3, height: 18, background: T.accent, borderRadius: 2 }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, fontFamily: "'Syne', sans-serif" }}>
          {children}
        </span>
      </div>
      {action}
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────── */
export default function SupervisorDashboard() {
  const { currentUser }   = useAuth();
  const { isMobile }      = useResponsive();
  const { data: team }    = useTeamBySupervisor(currentUser.id);
  const { data: teamTickets = [], refetch: refetchTeam } = useTicketsByTeam(team?.id);
  const { data: myTickets = [],   refetch: refetchMine } = useTicketsByUser(currentUser.id);

  const [view, setView]             = useState("equipo");
  const [filters, setFilters]       = useState(defaultFilters);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast]           = useState(null);

  useEffect(() => {
    const handleOpenTicket = (event) => {
      const ticketId = event.detail?.ticketId;
      if (!ticketId) return;
      setView("equipo");
      setSelectedId(ticketId);
    };

    window.addEventListener("ticketweb:open-ticket", handleOpenTicket);
    return () => window.removeEventListener("ticketweb:open-ticket", handleOpenTicket);
  }, []);

  const teamMembers = useMemo(
    () => {
      if (!team) return [];

      const members = Array.isArray(team.members) ? team.members : [];
      if (members.length) return members;

      return (team.memberIds || []).map((id) => ({
        id,
        name: id === currentUser.id ? currentUser.name : "",
        email: "",
        role: id === currentUser.id ? currentUser.role : "user",
        avatar: id === currentUser.id ? currentUser.avatar : null,
      }));
    },
    [team, currentUser],
  );

  const refetchAll = () => { refetchTeam(); refetchMine(); };

  /* Mix user names into tickets for display */
  const teamTicketsWithName = useMemo(() => {
    return teamTickets.map(t => ({
      ...t,
      _creatorName: t.createdByName || teamMembers.find((member) => member.id === t.createdBy)?.name || (t.createdBy === currentUser.id ? currentUser.name : "")
    }));
  }, [teamTickets, teamMembers, currentUser]);

  const myTicketsWithName = useMemo(() => {
    return myTickets.map(t => ({
      ...t,
      _creatorName: currentUser.name
    }));
  }, [myTickets, currentUser]);

  const teamFiltered = useMemo(() => applyFilters(teamTicketsWithName, filters), [teamTicketsWithName, filters]);
  const myFiltered   = useMemo(() => applyFilters(myTicketsWithName,   filters), [myTicketsWithName,   filters]);

  const stats = useMemo(() => ({
    total:     teamTickets.length,
    abierto:   teamTickets.filter((t) => t.status === "Abierto").length,
    enProceso: teamTickets.filter((t) => t.status === "En Proceso").length,
    critico:   teamTickets.filter((t) => (t.priority === "Crítica" || t.activity === "Sí") && t.status !== "Cerrado").length,
  }), [teamTickets]);

  const handleKpiClick = (status) => {
    setView("equipo");
    setFilters(prev => ({ ...prev, status: status || "Todos", priority: "Todas" }));
    setTimeout(() => {
      document.getElementById("ticket-list-area")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };
  const handleCriticalKpiClick = () => {
    setView("equipo");
    setFilters((prev) => ({ ...prev, status: "Todos", priority: "Crítica", activity: "Todas" }));
    setTimeout(() => {
      document.getElementById("ticket-list-area")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };
  const handleMemberClick = (memberId) => {
    setView("equipo");
    setFilters((prev) => ({
      ...prev,
      userId: prev.userId === memberId ? "" : memberId,
      status: "Todos",
      priority: "Todas",
      activity: "Todas",
    }));
    setTimeout(() => {
      document.getElementById("ticket-list-area")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };
  const handleExportHistory = () => {
    exportTicketsToCsv(
      teamFiltered,
      teamMembers,
      team ? [team] : [],
      `historial-equipo-${(team?.name || "supervision").toLowerCase().replace(/\s+/g, "-")}.xlsx`
    );
  };
  useEffect(() => {
    supervisorCriticalKpiHandler = handleCriticalKpiClick;
    return () => {
      supervisorCriticalKpiHandler = null;
    };
  }, []);

  const currentDate = new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div style={{ background: T.bgPage, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", padding: isMobile ? 12 : 20 }}>

      {/* ── Page Header ──────────────────────────────── */}
      <div style={{
        background:   T.bgHeader,
        borderRadius: 16,
        padding:      isMobile ? "18px 16px" : "28px 32px",
        marginBottom: 28,
        color:        T.white,
        display:      "flex",
        alignItems:   "center",
        justifyContent: "space-between",
        flexWrap:     "wrap",
        gap:          16,
        boxShadow:    "0 4px 24px rgba(30,91,181,0.25)",
        position:     "relative",
        overflow:     "visible",
      }}>
        {/* Decorative circles */}
        <div style={{ position: "absolute", right: -30, top: -30, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
        <div style={{ position: "absolute", right: 80, bottom: -50, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={18} color={T.white} />
            </div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, fontFamily: "'DM Sans', sans-serif", letterSpacing: "-0.02em" }}>
              Panel del Supervisor
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.75, fontWeight: 400 }}>
            {team?.name || "Sin equipo asignado"} &nbsp;·&nbsp; {teamMembers.length} miembros &nbsp;·&nbsp;
            <span style={{ textTransform: "capitalize" }}>{currentDate}</span>
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative", zIndex: 1 }}>
          <NotificationsBell compact={isMobile} />
          <button
            onClick={() => setShowCreate(true)}
            style={{
              background:   T.white,
              color:        T.accent,
              border:       "none",
              borderRadius: 10,
              padding:      "11px 22px",
              fontSize:     14,
              fontWeight:   700,
              fontFamily:   "'DM Sans', sans-serif",
              cursor:       "pointer",
              display:      "flex",
              alignItems:   "center",
              gap:          8,
              boxShadow:    "0 2px 12px rgba(0,0,0,0.15)",
              transition:   "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.15)"; }}
          >
            <Plus size={16} strokeWidth={2.5} /> Nuevo Ticket
          </button>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        <KpiCard label="Total Equipo" value={stats.total}     icon={BarChart2}     color={T.accent}   borderTop={T.accent} onClick={() => handleKpiClick(null)} />
        <KpiCard label="Abiertos"     value={stats.abierto}   icon={AlertCircle}   color={T.danger}   borderTop={T.danger} onClick={() => handleKpiClick("Abierto")} />
        <KpiCard label="En Proceso"   value={stats.enProceso} icon={Clock}         color={T.warning}  borderTop={T.warning} onClick={() => handleKpiClick("En Proceso")} />
        <KpiCard label="Críticos"     value={stats.critico}   icon={AlertTriangle} color={T.purple}   borderTop={T.purple} onClick={() => { setFilters(p => ({ ...p, status: "Todos", priority: "Todas", activity: "Todas" })); setTimeout(() => document.getElementById("ticket-list-area")?.scrollIntoView({ behavior: "smooth" }), 100); }} />
      </div>

      {/* ── Team members ─────────────────────────────── */}
      <div style={{ background: T.bgCard, borderRadius: 14, padding: "22px 24px", marginBottom: 24, border: `1px solid ${T.border}`, boxShadow: "0 2px 12px rgba(30,91,181,0.06)" }}>
        <SectionTitle>
          Miembros del Equipo
        </SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {teamMembers.map((member) => {
            const count = teamTickets.filter((t) => t.createdBy === member.id).length;
            const open  = teamTickets.filter((t) => t.createdBy === member.id && t.status === "Abierto").length;
            return (
              <MemberBadge
                key={member.id}
                member={member}
                ticketCount={count}
                openCount={open}
                isSelf={member.id === currentUser.id}
                isActive={view !== "mios" && filters.userId === member.id}
                onClick={() => handleMemberClick(member.id)}
              />
            );
          })}
        </div>
      </div>

      {/* ── Ticket table card ────────────────────────── */}
      <div id="ticket-list-area" style={{ background: T.bgCard, borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden", boxShadow: "0 2px 12px rgba(30,91,181,0.06)" }}>

        {/* Card header with tabs */}
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: T.bgPage }}>
          <div style={{ display: "flex", gap: 4, background: T.bgTabBar, borderRadius: 9, padding: 4, flex: 1, maxWidth: 480 }}>
            {[
              ["equipo",   "Tickets del Equipo"],
              ["mios",     "Mis Tickets"],
              ["historial","Historial"],
            ].map(([v, l]) => (
              <Tab key={v} label={l} active={view === v} onClick={() => { setView(v); setFilters(defaultFilters); }} />
            ))}
          </div>

          {/* Ticket count badge */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            {view === "historial" && (
              <button onClick={handleExportHistory} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 12px", color: T.accent, cursor: "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                <Download size={14} /> Exportar Excel
              </button>
            )}
            <span style={{ fontSize: 12, color: T.textMuted, fontFamily: "'DM Sans', sans-serif" }}>
              {view === "mios" ? myFiltered.length : teamFiltered.length} resultado{(view === "mios" ? myFiltered.length : teamFiltered.length) !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div style={{ padding: "16px 24px 0", borderBottom: `1px solid ${T.border}` }}>
          <StyledFiltersBar filters={filters} setFilters={setFilters} showUserFilter={view !== "mios"} users={teamMembers} />
        </div>

        {/* Table */}
        <div style={{ padding: "0 4px" }}>
          {view === "mios" ? (
            <StyledTicketTable tickets={myFiltered} onSelect={setSelectedId} />
          ) : view === "historial" ? (
            <div style={{ padding: "16px 20px" }}>
              {Object.entries(groupByMonth(teamFiltered)).map(([month, mTickets]) => (
                <div key={month} style={{ marginBottom: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: T.accent, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'DM Sans', sans-serif" }}>
                      {month}
                    </span>
                    <div style={{ flex: 1, height: 1, background: T.border }} />
                    <span style={{ fontSize: 11, color: T.textMuted, fontFamily: "monospace" }}>{mTickets.length} tickets</span>
                  </div>
                  <StyledTicketTable tickets={mTickets} onSelect={setSelectedId} showUser />
                </div>
              ))}
            </div>
          ) : (
            <StyledTicketTable tickets={teamFiltered} onSelect={setSelectedId} showUser />
          )}
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────── */}
      {showCreate && (
        <Modal title="Crear Nuevo Ticket" onClose={() => setShowCreate(false)} width={560}>
          <TicketForm onClose={() => setShowCreate(false)} onSuccess={(msg) => { setToast(msg); refetchAll(); }} />
        </Modal>
      )}

      {selectedId && (
        <Modal title="Detalle del Ticket" onClose={() => { setSelectedId(null); refetchAll(); }} width={680}>
          <TicketDetail ticketId={selectedId} canChangeStatus={false} canComment={true} onClose={() => setSelectedId(null)} onUpdate={refetchAll} knownUsers={teamMembers} />
        </Modal>
      )}

      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
    </div>
  );
}

/* ─── Styled Filters Bar (light theme) ─────────────────── */
function StyledFiltersBar({ filters, setFilters, showUserFilter, users }) {
  const inputStyle = {
    background:   T.bgPage,
    border:       `1.5px solid ${T.border}`,
    borderRadius: 8,
    padding:      "9px 14px",
    color:        T.textPrimary,
    fontSize:     13,
    fontFamily:   "'DM Sans', sans-serif",
    outline:      "none",
    cursor:       "pointer",
    transition:   "border-color 0.2s",
  };
  const focusStyle = (e) => (e.target.style.borderColor = T.accent);
  const blurStyle  = (e) => (e.target.style.borderColor = T.border);

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", paddingBottom: 16 }}>
      <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
        <svg style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input
          placeholder="Buscar tickets…"
          value={filters.search}
          onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
          style={{ ...inputStyle, width: "100%", paddingLeft: 34, boxSizing: "border-box" }}
          onFocus={focusStyle} onBlur={blurStyle}
        />
      </div>
      {[
        { key: "status",   opts: ["Todos", ...STATUSES] },
        { key: "priority", opts: ["Todas", ...PRIORITIES], label: "Prioridad" },
        { key: "activity", opts: ["Todas", ...ACTIVITY_OPTIONS], label: "¿Impide?" },
        { key: "category", opts: ["Todas", ...CATEGORIES] },
      ].map(({ key, opts, label }) => (
        <select key={key} value={filters[key]} onChange={(e) => setFilters((p) => ({ ...p, [key]: e.target.value }))} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle}>
          {label ? <option disabled value="">{label}</option> : null}
          {opts.map((o) => <option key={o}>{o}</option>)}
        </select>
      ))}
      {showUserFilter && (
        <select value={filters.userId} onChange={(e) => setFilters((p) => ({ ...p, userId: e.target.value }))} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle}>
          <option value="">Todos los miembros</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      )}
    </div>
  );
}

/* ─── Status / Priority pills (light theme) ─────────────── */
const STATUS_STYLES = {
  "Abierto":    { color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  "En Proceso": { color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  "Cerrado":    { color: "#059669", bg: "#f0fdf4", border: "#bbf7d0" },
  "Aplazado":   { color: "#7c3aed", bg: "#faf5ff", border: "#ddd6fe" },
};
const PRIORITY_STYLES = {
  "Baja":    { color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0" },
  "Media":   { color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
  "Alta":    { color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  "Crítica": { color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
};
const ACTIVITY_STYLES = {
  "Sí": { color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  "No": { color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0" },
};

function Pill({ label, styleMap }) {
  const s = styleMap[label] || { color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0" };
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 5, padding: "2px 10px", fontSize: 11, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap", display: "inline-block" }}>
      {label}
    </span>
  );
}

/* ─── Styled Ticket Table (light theme) ─────────────────── */
function StyledTicketTable({ tickets, onSelect, showUser = false }) {
  const { isMobile } = useResponsive();
  const isBlockingActivity = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim() === "si";

  if (tickets.length === 0) return (
    <div style={{ textAlign: "center", padding: "56px 20px" }}>
      <div style={{ width: 56, height: 56, borderRadius: 14, background: T.accentPale, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
        <Ticket size={26} color={T.accentLight} />
      </div>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: T.textPrimary, fontFamily: "'Syne', sans-serif" }}>Sin tickets</p>
      <p style={{ margin: "4px 0 0", fontSize: 13, color: T.textMuted }}>No hay tickets con los filtros seleccionados</p>
    </div>
  );

  const thStyle = {
    padding:       "11px 16px",
    textAlign:     "left",
    fontSize:      11,
    fontWeight:    700,
    color:         T.textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontFamily:    "'DM Sans', sans-serif",
    background:    T.bgPage,
    borderBottom:  `1.5px solid ${T.border}`,
    whiteSpace:    "nowrap",
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
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.accentLight, fontFamily: "monospace", marginBottom: 6 }}>
                    {getTicketDisplayId(ticket)}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>{ticket.title}</div>
                  {showUser && ticket._creatorName && (
                    <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 4 }}>{ticket._creatorName}</div>
                  )}
                </div>
                <ChevronRight size={16} color={T.accentLight} style={{ flexShrink: 0 }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase" }}>Categoria</div>
                  <div style={{ fontSize: 12, color: T.textSecondary }}>{ticket.category}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase" }}>Fecha</div>
                  <div style={{ fontSize: 12, color: T.textSecondary }}>{new Date(ticket.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <Pill label={ticket.priority} styleMap={PRIORITY_STYLES} />
                <Pill label={ticket.status} styleMap={STATUS_STYLES} />
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: T.textSecondary }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", display: "inline-block", background: blocking ? T.danger : T.success, boxShadow: `0 0 0 2px ${blocking ? T.dangerPale : T.successPale}` }} />
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
            {showUser && <th style={thStyle}>Solicitante</th>}
            <th style={thStyle}>Categoría</th>
            <th style={thStyle}>Actividad</th>
            <th style={thStyle}>Prioridad</th>
            <th style={thStyle}>Estado</th>
            <th style={thStyle}>Fecha</th>
            <th style={thStyle}></th>
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
              <td style={{ padding: "13px 16px" }}>
                <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: T.accentLight, background: T.accentPale, padding: "2px 7px", borderRadius: 4 }}>
                  {getTicketDisplayId(t)}
                </span>
              </td>
              <td style={{ padding: "13px 16px", maxWidth: 240 }}>
                <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600, color: T.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>
                  {t.title}
                </span>
              </td>
              {showUser && (
                <td style={{ padding: "13px 16px" }}>
                  <span style={{ fontSize: 12, color: T.textSecondary, fontWeight: 500 }}>
                    {t._creatorName}
                  </span>
                </td>
              )}
              <td style={{ padding: "13px 16px" }}>
                <span style={{ fontSize: 12, color: T.textSecondary, fontWeight: 500 }}>{t.category}</span>
              </td>
              <td style={{ padding: "13px 16px" }}>
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
              <td style={{ padding: "13px 16px" }}>
                <Pill label={t.priority} styleMap={PRIORITY_STYLES} />
              </td>
              <td style={{ padding: "13px 16px" }}>
                <Pill label={t.status} styleMap={STATUS_STYLES} />
              </td>
              <td style={{ padding: "13px 16px" }}>
                <span style={{ fontSize: 12, color: T.textMuted, fontFamily: "monospace" }}>
                  {new Date(t.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                </span>
              </td>
              <td style={{ padding: "13px 16px" }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: T.accentPale, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ChevronRight size={14} color={T.accentLight} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
