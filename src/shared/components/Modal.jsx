import { X } from "lucide-react";
import { useResponsive } from "../hooks/use-responsive.js";

/**
 * Modal
 * @param {{ title: string, onClose: () => void, width?: number, children: React.ReactNode }} props
 */
export default function Modal({ title, children, onClose, width = 640 }) {
  const { isMobile } = useResponsive();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,42,94,0.18)",
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: isMobile ? 0 : 20,
        backdropFilter: "blur(10px)",
      }}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        style={{
          background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
          border: "1px solid #dbeafe",
          borderRadius: isMobile ? "18px 18px 0 0" : 18,
          overflow: "hidden",
          width: "100%",
          maxWidth: isMobile ? "100%" : width,
          maxHeight: isMobile ? "92vh" : "90vh",
          minHeight: isMobile ? "55vh" : "auto",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 28px 80px rgba(30,91,181,0.22)",
          animation: "modalIn 0.25s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: isMobile ? "16px 16px 14px" : "20px 24px",
            borderBottom: "1px solid #dbeafe",
            background: "linear-gradient(180deg, rgba(219,234,254,0.55) 0%, rgba(255,255,255,0.8) 100%)",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: isMobile ? 16 : 18,
              fontWeight: 700,
              color: "#0f2a5e",
              fontFamily: "'Syne', sans-serif",
              paddingRight: 12,
            }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#4a6fa5",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              borderRadius: 4,
              transition: "color 0.2s",
              flexShrink: 0,
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.color = "#1e5bb5";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color = "#4a6fa5";
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div
          style={{
            overflowY: "auto",
            padding: isMobile ? "16px 14px 20px" : "24px",
            background: "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, #f8fbff 100%)",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
