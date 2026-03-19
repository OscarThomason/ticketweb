export default function BrandMark({
  size = 36,
  showWordmark = false,
  title = "Russell Bedford",
  subtitle = "taking you further",
  textColor = "#0f2a5e",
  subtitleColor = "#4a6fa5",
}) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        role="img"
        aria-label="Russell Bedford"
        style={{ display: "block", flexShrink: 0 }}
      >
        <defs>
          <clipPath id="rb-circle-clip">
            <circle cx="50" cy="50" r="34" />
          </clipPath>
        </defs>

        <circle cx="50" cy="50" r="46" fill="#ffffff" />
        <circle cx="50" cy="50" r="46" fill="none" stroke="#17c8d3" strokeWidth="8" strokeDasharray="72 217" strokeDashoffset="0" />
        <circle cx="50" cy="50" r="46" fill="none" stroke="#f29b10" strokeWidth="8" strokeDasharray="72 217" strokeDashoffset="-72" />
        <circle cx="50" cy="50" r="46" fill="none" stroke="#17267d" strokeWidth="8" strokeDasharray="72 217" strokeDashoffset="-144" />
        <circle cx="50" cy="50" r="46" fill="none" stroke="#b013a8" strokeWidth="8" strokeDasharray="72 217" strokeDashoffset="-216" />

        <circle cx="50" cy="50" r="34" fill="#ffffff" />
        <g clipPath="url(#rb-circle-clip)">
          <rect x="16" y="16" width="68" height="68" fill="#17267d" />
          {Array.from({ length: 9 }).map((_, index) => (
            <rect
              key={index}
              x={-20 + index * 12}
              y="8"
              width="7"
              height="100"
              fill="#ffffff"
              transform="rotate(35 50 50)"
            />
          ))}
        </g>
      </svg>

      {showWordmark && (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: Math.max(14, Math.round(size * 0.34)), fontWeight: 700, color: textColor, lineHeight: 1.05 }}>
            {title}
          </div>
          <div
            style={{
              fontSize: Math.max(10, Math.round(size * 0.16)),
              color: subtitleColor,
              fontStyle: "italic",
              lineHeight: 1.1,
              marginTop: 2,
            }}
          >
            {subtitle}
          </div>
        </div>
      )}
    </div>
  );
}
