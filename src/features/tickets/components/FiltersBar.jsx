import { Search }                            from "lucide-react";
import { STATUSES, PRIORITIES, CATEGORIES } from "../../../shared/utils/tickets.js";

/**
 * FiltersBar
 * @param {{ filters: object, setFilters: Function, showUserFilter?: boolean, users?: Array }} props
 */
export default function FiltersBar({ filters, setFilters, showUserFilter = false, users = [] }) {
  const inputStyle = {
    background:   "#0d1117",
    border:       "1px solid #2a3040",
    borderRadius: 6,
    padding:      "9px 14px",
    color:        "#e2e8f0",
    fontSize:     13,
    fontFamily:   "'DM Sans', sans-serif",
    outline:      "none",
    cursor:       "pointer",
  };

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
      {/* Search */}
      <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
        <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
        <input
          placeholder="Buscar tickets…"
          value={filters.search}
          onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
          style={{ ...inputStyle, width: "100%", paddingLeft: 32, boxSizing: "border-box" }}
          onFocus={(e) => (e.target.style.borderColor = "#00d4ff")}
          onBlur={(e)  => (e.target.style.borderColor = "#2a3040")}
        />
      </div>

      {/* Status */}
      <select value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))} style={inputStyle}>
        {["Todos", ...STATUSES].map((o) => <option key={o}>{o}</option>)}
      </select>

      {/* Priority */}
      <select value={filters.priority} onChange={(e) => setFilters((p) => ({ ...p, priority: e.target.value }))} style={inputStyle}>
        {["Todas", ...PRIORITIES].map((o) => <option key={o}>{o}</option>)}
      </select>

      {/* Category */}
      <select value={filters.category} onChange={(e) => setFilters((p) => ({ ...p, category: e.target.value }))} style={inputStyle}>
        {["Todas", ...CATEGORIES].map((o) => <option key={o}>{o}</option>)}
      </select>

      {/* User (optional) */}
      {showUserFilter && (
        <select value={filters.userId} onChange={(e) => setFilters((p) => ({ ...p, userId: e.target.value }))} style={inputStyle}>
          <option value="">Todos los usuarios</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      )}
    </div>
  );
}
