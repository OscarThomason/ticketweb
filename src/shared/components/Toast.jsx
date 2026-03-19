import { useEffect }            from "react";
import { Check, AlertCircle }   from "lucide-react";

const COLORS = { success: "#10b981", error: "#ef4444", info: "#6366f1" };

/**
 * Toast
 * @param {{ message: string, type?: "success"|"error"|"info", onClose: () => void }} props
 */
export default function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const color = COLORS[type];

  return (
    <div
      style={{
        position:    "fixed",
        bottom:      24,
        right:       24,
        background:  "#1a1f2e",
        border:      `1px solid ${color}60`,
        borderLeft:  `3px solid ${color}`,
        borderRadius: 8,
        padding:     "12px 20px",
        color:       "#e2e8f0",
        fontSize:    14,
        fontFamily:  "'DM Sans', sans-serif",
        zIndex:      9999,
        boxShadow:   `0 8px 32px ${color}20`,
        display:     "flex",
        alignItems:  "center",
        gap:         10,
        maxWidth:    360,
        animation:   "slideUp 0.3s ease",
      }}
    >
      {type === "success"
        ? <Check size={16} color={color} />
        : <AlertCircle size={16} color={color} />}
      {message}
    </div>
  );
}
