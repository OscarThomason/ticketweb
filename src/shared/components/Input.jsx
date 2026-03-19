/**
 * Input
 * @param {{ label?: string } & React.InputHTMLAttributes} props
 */
export default function Input({ label, style: extraStyle, labelStyle, ...rest }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace", ...labelStyle }}>
          {label}
        </label>
      )}
      <input
        {...rest}
        style={{
          width:       "100%",
          background:  "#0d1117",
          border:      "1px solid #2a3040",
          borderRadius: 6,
          padding:     "10px 14px",
          color:       "#e2e8f0",
          fontSize:    14,
          fontFamily:  "'DM Sans', sans-serif",
          outline:     "none",
          boxSizing:   "border-box",
          transition:  "border-color 0.2s",
          ...extraStyle,
        }}
        onFocus={(e) => (e.target.style.borderColor = "#00d4ff")}
        onBlur={(e)  => (e.target.style.borderColor = "#2a3040")}
      />
    </div>
  );
}
