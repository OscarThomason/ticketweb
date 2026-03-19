
import { useState, useMemo } from "react";
import {
  Ticket, AlertCircle, Clock, CheckCircle2,
  Plus, ChevronRight, FileText, User, Download,
} from "lucide-react";
import { useAuth }              from "../../../../app/providers/auth-context.js";
import { useTicketsByUser }     from "../../../../services/tickets/hooks/use-tickets.js";
import TicketDetail             from "../TicketDetail.jsx";
import TicketForm               from "../../../../services/tickets/components/TicketForm.jsx";
import Modal                    from "../../../../shared/components/Modal.jsx";
import Toast                    from "../../../../shared/components/Toast.jsx";
import { useResponsive }        from "../../../../shared/hooks/use-responsive.js";
import { applyFilters, defaultFilters, groupByMonth, STATUSES, PRIORITIES, CATEGORIES, ACTIVITY_OPTIONS }
  from "../../../../shared/utils/tickets.js";
import { exportTicketsToCsv } from "../../../../shared/utils/export-history.js";

/* ─── Design tokens ─────────────────────────────────────── */
const T = {
  bgPage:       "#f0f6ff",
  bgCard:       "#ffffff",
  bgHeader:     "linear-gradient(135deg, #1a3a6e 0%, #1e5bb5 100%)",
  bgTabBar:     "#e8f0fe",
  border:       "#cce0ff",
  borderStrong: "#93c5fd",
  accent:       "#1e5bb5",
  accentLight:  "#4a90d9",
  accentSky:    "#7ab8f5",
  accentPale:   "#dbeafe",
  textPrimary:  "#0f2a5e",
  textSecondary:"#4a6fa5",
  textMuted:    "#8aafd4",
  white:        "#ffffff",
  danger:       "#dc2626",
  dangerPale:   "#fef2f2",
  warning:      "#d97706",
  warningPale:  "#fffbeb",
  success:      "#059669",
  successPale:  "#f0fdf4",
  purple:       "#7c3aed",
  purplePale:   "#faf5ff",
};

/* ─── Semantic maps ─────────────────────────────────────── */
const STATUS_STYLES = {
  "Abierto":    { color: T.danger,  bg: T.dangerPale,   border: "#fecaca" },
  "En Proceso": { color: T.warning, bg: T.warningPale,  border: "#fde68a" },
  "Cerrado":    { color: T.success, bg: T.successPale,  border: "#bbf7d0" },
  "Aplazado":   { color: T.purple,  bg: T.purplePale,   border: "#ddd6fe" },
};
const PRIORITY_STYLES = {
  "Baja":    { color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0" },
  "Media":   { color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
  "Alta":    { color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  "Crítica": { color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
};
const ACTIVITY_STYLES = {
  "Sí": { color: T.danger, bg: T.dangerPale, border: "#fecaca" },
  "No": { color: T.textMuted, bg: "#f1f5f9", border: "#e2e8f0" },
};

function Pill({ label, map }) {
  const s = map[label] || { color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0" };
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 5, padding: "2px 10px", fontSize: 11, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

/* ─── KPI Card ──────────────────────────────────────────── */
function KpiCard({ label, value, icon, color, bg, onClick }) {
  const IconComponent = icon;

  return (
    <div
      onClick={onClick}
      style={{
        background: T.bgCard, borderRadius: 12, padding: "18px 20px",
        border: `1px solid ${T.border}`, borderTop: `3px solid ${color}`,
        boxShadow: "0 2px 10px rgba(30,91,181,0.07)", position: "relative",
        overflow: "hidden", cursor: onClick ? "pointer" : "default",
        transition: "transform 0.2s, box-shadow 0.2s"
      }}
      onMouseEnter={(e) => { if (onClick) { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(30,91,181,0.15)"; } }}
      onMouseLeave={(e) => { if (onClick) { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 10px rgba(30,91,181,0.07)"; } }}
    >
      <div style={{ position: "absolute", right: -8, bottom: -8, opacity: 0.06 }}>
        <IconComponent size={72} color={color} />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <IconComponent size={15} color={color} strokeWidth={2.2} />
        </div>
      </div>
      <div style={{ fontSize: 36, fontWeight: 700, color: T.textPrimary, fontFamily: "var(--font-metric)", letterSpacing: "-0.04em", lineHeight: 1 }}>{value}</div>
    </div>
  );
}

/* ─── Tab ───────────────────────────────────────────────── */
function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ background: active ? T.bgCard : "transparent", color: active ? T.accent : T.textSecondary, border: "none", padding: "8px 20px", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: active ? 700 : 500, fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s", boxShadow: active ? "0 1px 6px rgba(30,91,181,0.14)" : "none", whiteSpace: "nowrap" }}>
      {label}
    </button>
  );
}

/* ─── Filters ───────────────────────────────────────────── */
function LightFilters({ filters, setFilters }) {
  const iStyle = { background: T.bgPage, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "9px 14px", color: T.textPrimary, fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none", cursor: "pointer", transition: "border-color 0.2s" };
  const fo = (e) => (e.target.style.borderColor = T.accent);
  const bl = (e) => (e.target.style.borderColor = T.border);
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: "16px 24px", borderBottom: `1px solid ${T.border}`, background: T.bgPage }}>
      <div style={{ flex: 1, minWidth: 180, position: "relative" }}>
        <svg style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input
          placeholder="Buscar tickets…"
          value={filters.search}
          onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
          style={{ ...iStyle, width: "100%", paddingLeft: 32, boxSizing: "border-box" }}
          onFocus={fo} onBlur={bl}
        />
      </div>
      {[
        { k: "status",   opts: ["Todos",  ...STATUSES]   },
        { k: "priority", opts: ["Todas",  ...PRIORITIES], label: "Prioridad" },
        { k: "activity", opts: ["Todas",  ...ACTIVITY_OPTIONS], label: "¿Impide?" },
        { k: "category", opts: ["Todas",  ...CATEGORIES] },
      ].map(({ k, opts, label }) => (
        <select key={k} value={filters[k]} onChange={(e) => setFilters((p) => ({ ...p, [k]: e.target.value }))} style={iStyle} onFocus={fo} onBlur={bl}>
          {label && <option disabled value="">{label}</option>}
          {opts.map((o) => <option key={o}>{o}</option>)}
        </select>
      ))}
    </div>
  );
}

/* ─── Ticket Table ──────────────────────────────────────── */
function LightTicketTable({ tickets, onSelect }) {
  const isBlockingActivity = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim() === "si";

  if (tickets.length === 0) return (
    <div style={{ textAlign: "center", padding: "56px 20px" }}>
      <div style={{ width: 56, height: 56, borderRadius: 14, background: T.accentPale, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
        <FileText size={26} color={T.accentLight} />
      </div>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: T.textPrimary, fontFamily: "'Syne', sans-serif" }}>Sin tickets</p>
      <p style={{ margin: "4px 0 0", fontSize: 13, color: T.textMuted }}>Crea tu primer ticket con el botón de arriba</p>
    </div>
  );

  const thS = {
    padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 700,
    color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em",
    fontFamily: "'DM Sans', sans-serif", background: T.bgPage,
    borderBottom: `1.5px solid ${T.border}`, whiteSpace: "nowrap",
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            <th style={thS}>ID</th>
            <th style={thS}>Título</th>
            <th style={thS}>Categoría</th>
            <th style={thS}>Actividad</th>
            <th style={thS}>Prioridad</th>
            <th style={thS}>Estado</th>
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
              <td style={{ padding: "13px 16px" }}>
                <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: T.accentLight, background: T.accentPale, padding: "2px 7px", borderRadius: 4 }}>
                  {t.id}
                </span>
              </td>
              <td style={{ padding: "13px 16px", maxWidth: 260 }}>
                <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600, color: T.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>
                  {t.title}
                </span>
              </td>
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
                <Pill label={t.priority} map={PRIORITY_STYLES} />
              </td>
              <td style={{ padding: "13px 16px" }}>
                <Pill label={t.status} map={STATUS_STYLES} />
              </td>
              <td style={{ padding: "13px 16px" }}>
                <span style={{ fontSize: 12, color: T.textMuted, fontFamily: "monospace" }}>
                  {new Date(t.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </td>
              <td style={{ padding: "13px 16px" }}>
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

/* ═══════════════════ MAIN COMPONENT ════════════════════════ */
export default function UserDashboard() {
  const { currentUser }                     = useAuth();
  const { isMobile }                        = useResponsive();
  const { data: tickets = [], refetch }     = useTicketsByUser(currentUser.id);

  const [view, setView]             = useState("tickets");
  const [filters, setFilters]       = useState(defaultFilters);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast]           = useState(null);

  const filtered = useMemo(() => applyFilters(tickets, filters), [tickets, filters]);

  const stats = useMemo(() => ({
    total:     tickets.length,
    abierto:   tickets.filter((t) => t.status === "Abierto").length,
    enProceso: tickets.filter((t) => t.status === "En Proceso").length,
    cerrado:   tickets.filter((t) => t.status === "Cerrado").length,
  }), [tickets]);

  const handleKpiClick = (status) => {
    setFilters(prev => ({ ...prev, status: status || "Todos" }));
    if (status) setView("tickets");
    setTimeout(() => {
      document.getElementById("ticket-list-area")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const currentDate = new Date().toLocaleDateString("es-MX", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const handleExportHistory = () => {
    exportTicketsToCsv(
      filtered,
      [{ id: currentUser.id, name: currentUser.name }],
      [],
      `historial-${currentUser.name.toLowerCase().replace(/\s+/g, "-")}.xlsx`
    );
  };

  return (
    <div style={{ background: T.bgPage, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", padding: isMobile ? 12 : 20 }}>

      {/* ── Page Header ──────────────────────────────── */}
      <div style={{
        background:   T.bgHeader,
        borderRadius: 16,
        padding:      isMobile ? "18px 16px" : "26px 32px",
        marginBottom: 28,
        color:        T.white,
        display:      "flex",
        alignItems:   "center",
        justifyContent: "space-between",
        flexWrap:     "wrap",
        gap:          16,
        boxShadow:    "0 4px 24px rgba(30,91,181,0.25)",
        position:     "relative",
        overflow:     "hidden",
      }}>
        {/* Decorative circles */}
        <div style={{ position: "absolute", right: -30, top: -30, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
        <div style={{ position: "absolute", right: 100, bottom: -50, width: 130, height: 130, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <User size={18} color={T.white} />
            </div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, fontFamily: "'DM Sans', sans-serif", letterSpacing: "-0.02em" }}>
              Mis Tickets
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.75 }}>
            Bienvenido, {currentUser.name} &nbsp;·&nbsp;
            <span style={{ textTransform: "capitalize" }}>{currentDate}</span>
          </p>
        </div>

        {/* New ticket button */}
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
            position:     "relative",
            zIndex:       1,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.2)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.15)"; }}
        >
          <Plus size={16} strokeWidth={2.5} /> Nuevo Ticket
        </button>
      </div>

      {/* ── KPI Cards ────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        <KpiCard label="Total"      value={stats.total}     icon={Ticket}       color={T.accent}  bg={T.accentPale}  onClick={() => handleKpiClick(null)} />
        <KpiCard label="Abiertos"   value={stats.abierto}   icon={AlertCircle}  color={T.danger}  bg={T.dangerPale}  onClick={() => handleKpiClick("Abierto")} />
        <KpiCard label="En Proceso" value={stats.enProceso} icon={Clock}        color={T.warning} bg={T.warningPale} onClick={() => handleKpiClick("En Proceso")} />
        <KpiCard label="Cerrados"   value={stats.cerrado}   icon={CheckCircle2} color={T.success} bg={T.successPale} onClick={() => handleKpiClick("Cerrado")} />
      </div>

      {/* ── Main card ────────────────────────────────── */}
      <div id="ticket-list-area" style={{ background: T.bgCard, borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden", boxShadow: "0 2px 12px rgba(30,91,181,0.06)" }}>

        {/* Card header — tabs + count */}
        <div style={{ padding: "16px 24px", background: T.bgPage, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 4, background: T.bgTabBar, borderRadius: 9, padding: 4 }}>
            <Tab label="Mis Tickets" active={view === "tickets"}  onClick={() => { setView("tickets");  setFilters(defaultFilters); }} />
            <Tab label="Historial"   active={view === "historial"} onClick={() => { setView("historial"); setFilters(defaultFilters); }} />
          </div>

          {/* Result count */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            {view === "historial" && (
              <button onClick={handleExportHistory} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 12px", color: T.accent, cursor: "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                <Download size={14} /> Exportar Excel
              </button>
            )}
            <span style={{ fontSize: 12, color: T.textMuted }}>
              {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Filters */}
        <LightFilters filters={filters} setFilters={setFilters} />

        {/* Content */}
        {view === "historial" ? (
          <div style={{ padding: "16px 24px" }}>
            {Object.keys(groupByMonth(filtered)).length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <p style={{ margin: 0, fontSize: 14, color: T.textMuted }}>No hay tickets en el historial</p>
              </div>
            ) : (
              Object.entries(groupByMonth(filtered)).map(([month, mTickets]) => (
                <div key={month} style={{ marginBottom: 28 }}>
                  {/* Month separator */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: T.accent, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'DM Sans', sans-serif" }}>
                      {month}
                    </span>
                    <div style={{ flex: 1, height: 1, background: T.border }} />
                    <span style={{ fontSize: 11, color: T.textMuted, fontFamily: "monospace" }}>
                      {mTickets.length} ticket{mTickets.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${T.border}` }}>
                    <LightTicketTable tickets={mTickets} onSelect={setSelectedId} />
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <LightTicketTable tickets={filtered} onSelect={setSelectedId} />
        )}
      </div>

      {/* ── Modals ───────────────────────────────────── */}
      {showCreate && (
        <Modal title="Crear Nuevo Ticket" onClose={() => setShowCreate(false)} width={560}>
          <TicketForm
            onClose={() => setShowCreate(false)}
            onSuccess={(msg) => { setToast(msg); refetch(); }}
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
          />
        </Modal>
      )}

      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
    </div>
  );
}
