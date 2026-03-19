/**
 * Select
 * @param {{ label?: string, options: Array<string | { value: string, label: string }> } & React.SelectHTMLAttributes} props
 */
export default function Select({ label, options = [], style: extraStyle, labelStyle, focusBorderColor = "#00d4ff", blurBorderColor = "#2a3040", ...rest }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace", ...labelStyle }}>
          {label}
        </label>
      )}
      <select
        {...rest}
        style={{
          width:        "100%",
          background:   "#0d1117",
          border:       "1px solid #2a3040",
          borderRadius: 6,
          padding:      "10px 14px",
          color:        "#e2e8f0",
          fontSize:     14,
          fontFamily:   "'DM Sans', sans-serif",
          outline:      "none",
          boxSizing:    "border-box",
          cursor:       "pointer",
          ...extraStyle,
        }}
        onFocus={(e) => (e.target.style.borderColor = focusBorderColor)}
        onBlur={(e)  => (e.target.style.borderColor = blurBorderColor)}
      >
        {options.map((o) => (
          <option key={o.value ?? o} value={o.value ?? o}>
            {o.label ?? o}
          </option>
        ))}
      </select>
    </div>
  );
}
