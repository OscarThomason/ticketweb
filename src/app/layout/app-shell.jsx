import { Ticket, LogOut } from "lucide-react";
import Avatar              from "../../shared/components/Avatar.jsx";
import { useAuth }         from "../providers/auth-context.js";
import { ROLE_LABELS, ROLE_COLORS } from "../../shared/utils/tickets.js";
import { useResponsive } from "../../shared/hooks/use-responsive.js";

/**
 * AppShell
 * Provides the sidebar + main content area for authenticated users.
 * @param {{ children: React.ReactNode }} props
 */
export default function AppShell({ children }) {
  const { currentUser, logout } = useAuth();
  const color = ROLE_COLORS[currentUser.role];
  const { isMobile } = useResponsive();

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f0f6ff", fontFamily: "'DM Sans', sans-serif" }}>
      {/* ── Sidebar ─────────────────────────────── */}
      {!isMobile && <aside style={{ width: 220, background: "#1a3a6e", borderRight: "1px solid #2a3040", display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh" }}>

        {/* Logo */}
        <div style={{ padding: "24px 20px", borderBottom: "1px solid #2a3040" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: `${color}22`, border: `1.5px solid ${color}`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ticket size={16} color={color} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#f0f6ff", fontFamily: "'DM Sans', sans-serif" }}>Tickets Support</p>
              <p style={{ margin: 0, fontSize: 10, color: "#1f2023", fontFamily: "monospace" }}>v1.0.0</p>
            </div>
          </div>
        </div>

        {/* User card */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1a2030", background: `${color}08` }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Avatar initials={currentUser.avatar} size={36} color={color} />
            <div style={{ overflow: "hidden" }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#e3e7ec", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {currentUser.name}
              </p>
              <span style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 700, color, background: `${color}18`, padding: "1px 6px", borderRadius: 3 }}>
                {ROLE_LABELS[currentUser.role]}
              </span>
            </div>
          </div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Logout */}
        <div style={{ padding: 16, borderTop: "1px solid #2a3040" }}>
          <button
            onClick={logout}
            style={{ width: "100%", background: "transparent", border: "1px solid #2a3040", borderRadius: 6, padding: "9px 14px", color: "#64748b", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#ef444440"; e.currentTarget.style.color = "#ef4444"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2a3040";   e.currentTarget.style.color = "#64748b"; }}
          >
            <LogOut size={15} /> Cerrar sesión
          </button>
        </div>
      </aside>}

      {/* ── Main content ────────────────────────── */}
      <main style={{ flex: 1, padding: isMobile ? "14px 10px" : "32px 36px", overflowY: "auto", minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
}
