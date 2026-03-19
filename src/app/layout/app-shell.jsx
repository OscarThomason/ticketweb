import { LogOut } from "lucide-react";
import Avatar from "../../shared/components/Avatar.jsx";
import BrandMark from "../../shared/components/BrandMark.jsx";
import { useAuth } from "../providers/auth-context.js";
import { ROLE_LABELS, ROLE_COLORS } from "../../shared/utils/tickets.js";
import { useResponsive } from "../../shared/hooks/use-responsive.js";

export default function AppShell({ children }) {
  const { currentUser, logout } = useAuth();
  const color = ROLE_COLORS[currentUser.role];
  const { isMobile } = useResponsive();
  const appTitle = "Tickets Support";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f0f6ff", fontFamily: "'DM Sans', sans-serif" }}>
      {!isMobile && (
        <aside
          style={{
            width: 220,
            background: "#1a3a6e",
            borderRight: "1px solid #2a3040",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
            position: "sticky",
            top: 0,
            height: "100vh",
          }}
        >
          <div style={{ padding: "24px 20px", borderBottom: "1px solid #2a3040" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <BrandMark size={32} />
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#f0f6ff" }}>{appTitle}</p>
                <p style={{ margin: 0, fontSize: 10, color: "#8aafd4", fontFamily: "monospace" }}>RB edition</p>
              </div>
            </div>
          </div>

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

          <div style={{ flex: 1 }} />

          <div style={{ padding: 16, borderTop: "1px solid #2a3040" }}>
            <button
              onClick={logout}
              style={{
                width: "100%",
                background: "transparent",
                border: "1px solid #2a3040",
                borderRadius: 6,
                padding: "9px 14px",
                color: "#64748b",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
                transition: "all 0.2s",
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.borderColor = "#ef444440";
                event.currentTarget.style.color = "#ef4444";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.borderColor = "#2a3040";
                event.currentTarget.style.color = "#64748b";
              }}
            >
              <LogOut size={15} /> Cerrar sesión
            </button>
          </div>
        </aside>
      )}

      <main style={{ flex: 1, padding: isMobile ? "14px 10px" : "32px 36px", overflowY: "auto", minWidth: 0 }}>
        {isMobile && (
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 20,
              marginBottom: 14,
              background: "linear-gradient(135deg, #1a3a6e 0%, #1e5bb5 100%)",
              border: "1px solid #93c5fd",
              borderRadius: 14,
              padding: "12px 14px",
              boxShadow: "0 8px 18px rgba(30,91,181,0.18)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <BrandMark size={24} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#ffffff" }}>{appTitle}</p>
                <p style={{ margin: "2px 0 0", fontSize: 10, color: "rgba(255,255,255,0.75)", fontFamily: "monospace" }}>
                  {ROLE_LABELS[currentUser.role]}
                </p>
              </div>
              <button
                onClick={logout}
                style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 10,
                  padding: "8px 10px",
                  color: "#ffffff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                <LogOut size={14} /> Salir
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, minWidth: 0 }}>
              <Avatar initials={currentUser.avatar} size={34} color={color} />
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {currentUser.name}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255,255,255,0.75)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {currentUser.email || ""}
                </p>
              </div>
            </div>
          </div>
        )}

        {children}
      </main>
    </div>
  );
}
