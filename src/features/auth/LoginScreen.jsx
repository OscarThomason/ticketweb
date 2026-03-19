import { useState } from "react";
import { Eye, EyeOff, LogIn, Mail } from "lucide-react";
import BrandMark from "../../shared/components/BrandMark.jsx";
import { useResponsive } from "../../shared/hooks/use-responsive.js";

const T = {
  bgCard: "#ffffff",
  accent: "#162a7b",
  accentLight: "#245ac7",
  border: "#d6e4f5",
  textPrimary: "#0f2a5e",
  textSecondary: "#4a6fa5",
  textMuted: "#7a97c0",
  danger: "#dc2626",
  dangerPale: "#fef2f2",
  white: "#ffffff",
};

function Field({ label, children, error }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          display: "block",
          marginBottom: 6,
          fontSize: 11,
          fontWeight: 700,
          color: T.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.09em",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {label}
      </label>
      {children}
      {error && <p style={{ margin: "6px 0 0", color: T.danger, fontSize: 12 }}>{error}</p>}
    </div>
  );
}

export default function LoginScreen({ onLogin }) {
  const { isMobile } = useResponsive();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [buttonHovered, setButtonHovered] = useState(false);
  const [buttonPressed, setButtonPressed] = useState(false);

  const inputStyle = {
    width: "100%",
    background: "#f8fbff",
    border: `1.5px solid ${T.border}`,
    borderRadius: 10,
    padding: "12px 14px",
    color: T.textPrimary,
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    outline: "none",
    boxSizing: "border-box",
  };

  const handleLogin = async () => {
    setError("");
    if (!email.trim() || !password) {
      setError("Completa correo y contraseña");
      return;
    }

    setLoading(true);
    try {
      await onLogin({ email: email.trim().toLowerCase(), password }, remember);
    } catch {
      setError("Correo o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0f2469 0%, #14337c 48%, #1f4d9c 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "24px 14px" : "42px 20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at 14% 20%, rgba(255,255,255,0.06) 0, rgba(255,255,255,0.06) 4%, transparent 4.5%), radial-gradient(circle at 84% 16%, rgba(255,255,255,0.05) 0, rgba(255,255,255,0.05) 5%, transparent 5.5%), radial-gradient(circle at 76% 80%, rgba(255,255,255,0.04) 0, rgba(255,255,255,0.04) 6%, transparent 6.5%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.14,
          background: "linear-gradient(135deg, transparent 0 46%, rgba(255,255,255,0.14) 46% 47%, transparent 47% 100%)",
        }}
      />

      <div style={{ width: "100%", maxWidth: 540, position: "relative", zIndex: 1 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 20,
            paddingInline: isMobile ? 8 : 0,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <BrandMark
              size={isMobile ? 54 : 64}
              showWordmark
              textColor="#ffffff"
              subtitleColor="rgba(255,255,255,0.82)"
            />
            <p
              style={{
                margin: "12px 0 0",
                color: "rgba(255,255,255,0.82)",
                fontSize: 13,
                letterSpacing: "0.03em",
              }}
            >
              Plataforma de tickets y seguimiento interno
            </p>
          </div>
        </div>

        <div
          style={{
            width: "100%",
            background: T.bgCard,
            border: `1px solid ${T.border}`,
            borderRadius: 22,
            padding: isMobile ? 20 : 28,
            boxShadow: "0 16px 36px rgba(8,18,61,0.14)",
          }}
        >
          <div style={{ marginBottom: 18 }}>
            <p style={{ margin: 0, color: T.textPrimary, fontSize: 20, fontWeight: 800 }}>Acceso al sistema</p>
            <p style={{ margin: "4px 0 0", color: T.textMuted, fontSize: 13 }}>Ingresa con tu cuenta asignada</p>
          </div>

          <Field label="Correo electrónico">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleLogin()}
              style={inputStyle}
              autoComplete="email"
            />
          </Field>

          <Field label="Contraseña">
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleLogin()}
                style={{ ...inputStyle, paddingRight: 42 }}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  color: T.textMuted,
                  cursor: "pointer",
                  display: "flex",
                  padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>

          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, color: T.textSecondary, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={remember} onChange={() => setRemember((value) => !value)} />
            Mantener sesión iniciada
          </label>

          {error && (
            <div style={{ background: T.dangerPale, border: "1px solid #fecaca", borderRadius: 10, color: T.danger, padding: "10px 12px", marginBottom: 14, fontSize: 13 }}>
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: "100%",
              border: "none",
              borderRadius: 12,
              padding: "12px 14px",
              background: loading
                ? "#dbeafe"
                : buttonPressed
                  ? "linear-gradient(135deg, #102363 0%, #1e49a2 100%)"
                  : buttonHovered
                    ? "linear-gradient(135deg, #1a318c 0%, #2c66d6 100%)"
                    : `linear-gradient(135deg, ${T.accent} 0%, ${T.accentLight} 100%)`,
              color: T.white,
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: loading
                ? "none"
                : buttonHovered
                  ? "0 14px 28px rgba(22,42,123,0.28)"
                  : "0 10px 20px rgba(22,42,123,0.18)",
              transform: loading ? "none" : buttonPressed ? "translateY(1px) scale(0.995)" : buttonHovered ? "translateY(-1px)" : "none",
              transition: "transform 0.16s ease, box-shadow 0.2s ease, background 0.2s ease",
              position: "relative",
              overflow: "hidden",
            }}
            onMouseEnter={() => !loading && setButtonHovered(true)}
            onMouseLeave={() => {
              setButtonHovered(false);
              setButtonPressed(false);
            }}
            onMouseDown={() => !loading && setButtonPressed(true)}
            onMouseUp={() => setButtonPressed(false)}
            >
            {!loading && (
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  background: buttonHovered
                    ? "linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.08) 35%, rgba(255,255,255,0.22) 50%, transparent 65%)"
                    : "linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.05) 48%, transparent 62%)",
                  transform: buttonHovered ? "translateX(6%)" : "translateX(0)",
                  transition: "transform 0.25s ease, background 0.2s ease",
                }}
              />
            )}
            {loading ? (
              <span
                aria-hidden="true"
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.45)",
                  borderTopColor: "#ffffff",
                  display: "inline-block",
                  animation: "rb-spin 0.75s linear infinite",
                }}
              />
            ) : (
              <LogIn size={16} style={{ position: "relative", zIndex: 1 }} />
            )}
            <span style={{ position: "relative", zIndex: 1 }}>
              {loading ? "Entrando..." : "Iniciar sesión"}
            </span>
          </button>
        </div>

        <div
          style={{
            marginTop: 16,
            textAlign: "center",
            color: "#dce8ff",
            fontSize: isMobile ? 12 : 13,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 14,
            padding: "12px 14px",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <Mail size={14} />
            Si requiere una cuenta comuniquese con support - correo-support@rusellbedford.mx
          </span>
        </div>
      </div>
      <style>
        {`
          @keyframes rb-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
