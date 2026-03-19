import { useState } from "react";
import { Eye, EyeOff, LogIn, Ticket } from "lucide-react";
import { useResponsive } from "../../shared/hooks/use-responsive.js";

const T = {
  bgPage: "#f0f6ff",
  bgCard: "#ffffff",
  accent: "#1e5bb5",
  accentLight: "#4a90d9",
  accentPale: "#dbeafe",
  border: "#cce0ff",
  textPrimary: "#0f2a5e",
  textSecondary: "#4a6fa5",
  textMuted: "#8aafd4",
  danger: "#dc2626",
  dangerPale: "#fef2f2",
  white: "#ffffff",
};

function Field({ label, children, error }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", marginBottom: 6, fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.09em", fontFamily: "'DM Sans', sans-serif" }}>{label}</label>
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

  const inputStyle = {
    width: "100%",
    background: T.bgPage,
    border: `1.5px solid ${T.border}`,
    borderRadius: 9,
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
    <div style={{ minHeight: "100vh", background: T.bgPage, display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? "20px 14px" : "40px 20px" }}>
      <div style={{ width: "100%", maxWidth: 430, background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 14, padding: isMobile ? 20 : 28, boxShadow: "0 8px 24px rgba(15,42,94,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: T.accentPale, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ticket size={18} color={T.accent} />
          </div>
          <div>
            <p style={{ margin: 0, color: T.textPrimary, fontSize: 16, fontWeight: 800 }}>Tickets Support</p>
            <p style={{ margin: 0, color: T.textMuted, fontSize: 12 }}>Inicia sesión</p>
          </div>
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
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", color: T.textMuted, cursor: "pointer", display: "flex", padding: 0 }}
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
          <div style={{ background: T.dangerPale, border: "1px solid #fecaca", borderRadius: 8, color: T.danger, padding: "10px 12px", marginBottom: 14, fontSize: 13 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ width: "100%", border: "none", borderRadius: 10, padding: "12px 14px", background: loading ? "#dbeafe" : `linear-gradient(135deg, ${T.accent} 0%, ${T.accentLight} 100%)`, color: T.white, fontSize: 14, fontWeight: 700, cursor: loading ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          <LogIn size={16} />
          {loading ? "Entrando..." : "Iniciar sesión"}
        </button>
      </div>
    </div>
  );
}

