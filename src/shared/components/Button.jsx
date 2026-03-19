const VARIANTS = {
  primary:   { background: "#00d4ff",    color: "#0a0e17", border: "none" },
  secondary: { background: "transparent", color: "#e2e8f0", border: "1px solid #2a3040" },
  danger:    { background: "transparent", color: "#ef4444", border: "1px solid #ef444440" },
  ghost:     { background: "transparent", color: "#94a3b8", border: "none" },
  success:   { background: "transparent", color: "#10b981", border: "1px solid #10b98140" },
};

const SIZES = {
  sm: { padding: "6px 12px",  fontSize: 12 },
  md: { padding: "9px 18px",  fontSize: 14 },
  lg: { padding: "12px 24px", fontSize: 15 },
};

/**
 * Button
 * @param {{ variant?: keyof VARIANTS, size?: keyof SIZES } & React.ButtonHTMLAttributes} props
 */
export default function Button({ children, variant = "primary", size = "md", style: extraStyle, ...rest }) {
  return (
    <button
      {...rest}
      style={{
        ...VARIANTS[variant],
        ...SIZES[size],
        borderRadius: 6,
        cursor:       rest.disabled ? "not-allowed" : "pointer",
        fontWeight:   600,
        fontFamily:   "'DM Sans', sans-serif",
        display:      "inline-flex",
        alignItems:   "center",
        gap:          6,
        transition:   "all 0.2s",
        opacity:      rest.disabled ? 0.4 : 1,
        ...extraStyle,
      }}
      onMouseEnter={(e) => {
        if (!rest.disabled) {
          e.currentTarget.style.opacity   = "0.85";
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity   = "1";
        e.currentTarget.style.transform = "none";
      }}
    >
      {children}
    </button>
  );
}
