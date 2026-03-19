import { useEffect, useState } from "react";
import { Download, History } from "lucide-react";
import * as XLSX from "xlsx";
import { auditApi } from "../../../../services/audit/audit.api.js";

const T = {
  bgPage: "#f0f6ff",
  bgCard: "#ffffff",
  border: "#cce0ff",
  accent: "#1e5bb5",
  accentPale: "#dbeafe",
  textPrimary: "#0f2a5e",
  textSecondary: "#4a6fa5",
  textMuted: "#8aafd4",
};

export default function AuditLogPanel() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    let active = true;
    auditApi.getAll().then((data) => {
      if (active) setLogs(Array.isArray(data) ? data : []);
    }).catch(() => {
      if (active) setLogs([]);
    });
    return () => { active = false; };
  }, []);

  const handleExportAuditExcel = () => {
    const rows = logs.map((log) => ({
      Fecha: log.createdAt ? new Date(log.createdAt).toLocaleString("es-MX") : "",
      Actor: log.actorName || "",
      Accion: log.action || "",
      Entidad: log.entityType || "",
      Resumen: log.summary || "",
      Detalles: log.details || "",
      ID: log.id || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Historial");
    XLSX.writeFile(workbook, "historial-cambios.xlsx");
  };

  return (
    <div style={{ background: T.bgCard, borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden", boxShadow: "0 2px 10px rgba(30,91,181,0.06)" }}>
      <div style={{ padding: "18px 24px", background: T.bgPage, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 3, height: 16, background: T.accent, borderRadius: 2 }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>Historial de Cambios</span>
          <span style={{ fontSize: 12, background: T.accentPale, color: T.accent, borderRadius: 10, padding: "1px 10px", fontWeight: 700, fontFamily: "monospace" }}>
            {logs.length}
          </span>
        </div>
        <button
          onClick={handleExportAuditExcel}
          style={{ background: "#ffffff", border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: T.accent }}
        >
          <Download size={14} /> Exportar Excel
        </button>
      </div>

      {logs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: T.accentPale, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <History size={22} color={T.accent} />
          </div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.textPrimary }}>Sin cambios registrados</p>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: T.textMuted }}>Las acciones administrativas apareceran aqui.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10, padding: 18 }}>
          {logs.map((log) => (
            <div key={log.id} style={{ background: "#f8fbff", border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>{log.summary}</div>
                  <div style={{ fontSize: 12, color: T.textSecondary }}>
                    {log.actorName} · {log.action} · {log.entityType}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: T.textMuted, fontFamily: "monospace" }}>
                  {new Date(log.createdAt).toLocaleString("es-MX")}
                </div>
              </div>
              {log.details && (
                <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.6 }}>
                  {log.details}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

