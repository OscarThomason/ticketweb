/**
 * Avatar
 * @param {{ initials: string, size?: number, color?: string }} props
 */
export default function Avatar({ initials, size = 32, color = "#00d4ff" }) {
  return (
    <div
      style={{
        width:          size,
        height:         size,
        borderRadius:   "50%",
        background:     `${color}22`,
        border:         `1.5px solid ${color}55`,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        fontSize:       size * 0.35,
        fontWeight:     700,
        color,
        fontFamily:     "monospace",
        flexShrink:     0,
      }}
    >
      {initials}
    </div>
  );
}
