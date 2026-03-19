import { STATUS_CONFIG, PRIORITY_CONFIG } from "../../domain/ticket/ticket.constants.js";

/**
 * Badge
 * @param {{ status: string, type?: "status" | "priority" }} props
 */
export default function Badge({ status, type = "status" }) {
  const cfg = type === "status" ? STATUS_CONFIG[status] : PRIORITY_CONFIG[status];
  if (!cfg) return null;

  const Icon = type === "status" ? cfg.icon : null;

  return (
    <span
      style={{
        background:   cfg.bg,
        color:        cfg.color,
        border:       `1px solid ${cfg.color}40`,
        display:      "inline-flex",
        alignItems:   "center",
        gap:          4,
        padding:      "2px 10px",
        borderRadius: 4,
        fontSize:     11,
        fontWeight:   600,
        fontFamily:   "monospace",
        letterSpacing:"0.05em",
        ...(cfg.pulse ? { animation: "pulse 2s infinite" } : {}),
      }}
    >
      {Icon && <Icon size={10} />}
      {status}
    </span>
  );
}
