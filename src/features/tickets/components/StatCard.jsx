/**
 * StatCard — KPI card used in dashboards.
 * @param {{ label: string, value: number|string, color?: string, icon?: LucideIcon, subtitle?: string }} props
 */
export default function StatCard({ label, value, color = "#00d4ff", icon: Icon, subtitle }) {
  return (
    <div
      style={{
        background:   "#12171f",
        border:       `1px solid ${color}30`,
        borderRadius: 10,
        padding:      "18px 20px",
        position:     "relative",
        overflow:     "hidden",
      }}
    >
      {/* Glow orb */}
      <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle at 80% 20%, ${color}15, transparent 70%)` }} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace" }}>
          {label}
        </p>
        {Icon && (
          <div style={{ background: `${color}18`, borderRadius: 6, padding: 6 }}>
            <Icon size={16} color={color} />
          </div>
        )}
      </div>

      <p style={{ margin: 0, fontSize: 32, fontWeight: 800, color, fontFamily: "'Syne', sans-serif", lineHeight: 1 }}>
        {value}
      </p>

      {subtitle && (
        <p style={{ margin: "6px 0 0", fontSize: 11, color: "#64748b" }}>{subtitle}</p>
      )}
    </div>
  );
}
