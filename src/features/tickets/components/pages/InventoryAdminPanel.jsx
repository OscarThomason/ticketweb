import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Edit3, FileText, MessageSquarePlus, Monitor, PackagePlus, ScanBarcode, Trash2, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import Modal from "../../../../shared/components/Modal.jsx";
import { useResponsive } from "../../../../shared/hooks/use-responsive.js";
import { inventoryApi } from "../../../../services/inventory/inventory.api.js";
import { generateInventoryLabelPdf } from "../../../../services/inventory/inventory-label.pdf.js";
import { logAuditEntry } from "../../../../services/audit/audit.api.js";
import { isBackendEnabled } from "../../../../services/api/http-client.js";
import {
  deleteAttachmentFile,
  getAttachmentFile,
  saveAttachmentFile,
} from "../../../../services/tickets/attachments/attachments.store.js";
import { ticketsRepository } from "../../../../services/tickets/hooks/tickets.repository.local.js";
import { ticketsApi } from "../../../../services/tickets/api/tickets.api.js";

const T = {
  bgPage: "#f0f6ff",
  bgCard: "#ffffff",
  border: "#cce0ff",
  borderStrong: "#93c5fd",
  accent: "#1e5bb5",
  accentLight: "#4a90d9",
  accentPale: "#dbeafe",
  textPrimary: "#0f2a5e",
  textSecondary: "#4a6fa5",
  textMuted: "#8aafd4",
  white: "#ffffff",
  success: "#059669",
  warning: "#d97706",
};

const MAX_RESPONSIVA_SIZE = 5 * 1024 * 1024;

const emptyInventoryForm = {
  assignedUserId: "",
  owningTeamId: "",
  assetName: "",
  assetCategory: "Laptop",
  brand: "",
  model: "",
  serialNumber: "",
  operatingSystem: "",
  processor: "",
  ram: "",
  storage: "",
  location: "",
  status: "Activo",
  notes: "",
};

export default function InventoryAdminPanel({ users, teams, currentUser, onToast }) {
  const { isMobile } = useResponsive();
  const [inventoryItems, setInventoryItems] = useState([]);
  const [allTickets, setAllTickets] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [serialSearch, setSerialSearch] = useState("");
  const importInputRef = useRef(null);

  const reload = useCallback(async () => {
    const [items, tickets] = await Promise.all([
      inventoryApi.getAll(),
      isBackendEnabled() ? ticketsApi.getAll() : Promise.resolve(ticketsRepository.getAll()),
    ]);
    setInventoryItems(items);
    setAllTickets(tickets);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      reload().catch(() => {
        onToast?.("No se pudo cargar el inventario");
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [reload, onToast]);

  const itemsWithUsers = useMemo(() => {
    const normalizedSearch = serialSearch.trim().toUpperCase();
    return inventoryItems
      .map((item) => ({
        ...item,
        assignedUser: users.find((user) => user.id === item.assignedUserId) || null,
        owningTeam: teams.find((team) => team.id === item.owningTeamId) || null,
        ticketCount: item.assignedUserId ? allTickets.filter((ticket) => ticket.createdBy === item.assignedUserId).length : 0,
      }))
      .filter((item) => {
        if (!normalizedSearch) return true;
        const haystack = [
          item.serialNumber,
          item.assetName,
          item.brand,
          item.model,
          item.assignedUser?.name,
          item.owningTeam?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toUpperCase();
        return haystack.includes(normalizedSearch);
      });
  }, [inventoryItems, serialSearch, users, teams, allTickets]);

  const handleGenerateLabel = (item) => {
    try {
      generateInventoryLabelPdf(item);
      onToast("Etiqueta PDF generada correctamente");
    } catch {
      onToast("No se pudo generar la etiqueta del equipo");
    }
  };

  const handleExportInventoryExcel = () => {
    const rows = itemsWithUsers.map((item) => ({
      ID: item.id || "",
      Equipo: item.assetName || "",
      Categoria: item.assetCategory || "",
      Marca: item.brand || "",
      Modelo: item.model || "",
      Serie: item.serialNumber || "",
      SistemaOperativo: item.operatingSystem || "",
      Procesador: item.processor || "",
      RAM: item.ram || "",
      Almacenamiento: item.storage || "",
      Estado: item.status || "",
      Ubicacion: item.location || "",
      EquipoPropietario: item.owningTeam?.name || "",
      AsignadoA: item.assignedUser?.email || item.assignedUser?.name || "",
      Notas: item.notes || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");
    XLSX.writeFile(workbook, "inventario-equipos.xlsx");
  };

  const handleImportInventoryExcel = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (!rows.length) {
        onToast("El archivo no contiene filas para importar");
        return;
      }

      const currentInventory = [...inventoryItems];
      const teamLookup = teams;
      const userLookup = users;
      let processed = 0;
      let skipped = 0;

      for (const row of rows) {
        const rowId = String(row.ID || row.id || "").trim();
        const serial = String(row.Serie || row.serie || row.Serial || row.serialNumber || "").trim();
        const assetName = String(row.Equipo || row.equipo || row.assetName || "").trim();

        if (!assetName) {
          skipped += 1;
          continue;
        }

        const ownerValue = String(row.EquipoPropietario || row.equipoPropietario || row.owningTeamId || "").trim();
        const assignedValue = String(row.AsignadoA || row.asignadoA || row.assignedUserId || "").trim();
        const team = teamLookup.find((t) => t.id === ownerValue || t.name?.toLowerCase() === ownerValue.toLowerCase());
        const assignedUser = userLookup.find((u) =>
          u.id === assignedValue ||
          u.email?.toLowerCase() === assignedValue.toLowerCase() ||
          u.name?.toLowerCase() === assignedValue.toLowerCase(),
        );

        const payload = {
          assetName,
          assetCategory: String(row.Categoria || row.categoria || row.assetCategory || "Laptop").trim() || "Laptop",
          brand: String(row.Marca || row.marca || row.brand || "").trim(),
          model: String(row.Modelo || row.modelo || row.model || "").trim(),
          serialNumber: serial,
          operatingSystem: String(row.SistemaOperativo || row.sistemaOperativo || row.operatingSystem || "").trim(),
          processor: String(row.Procesador || row.procesador || row.processor || "").trim(),
          ram: String(row.RAM || row.ram || "").trim(),
          storage: String(row.Almacenamiento || row.almacenamiento || row.storage || "").trim(),
          status: String(row.Estado || row.estado || row.status || "Activo").trim() || "Activo",
          location: String(row.Ubicacion || row.ubicacion || row.location || "").trim(),
          notes: String(row.Notas || row.notas || row.notes || "").trim(),
          owningTeamId: team?.id || null,
          assignedUserId: assignedUser?.id || null,
        };

        const byId = rowId ? currentInventory.find((item) => item.id === rowId) : null;
        const bySerial = serial ? currentInventory.find((item) => item.serialNumber === serial) : null;
        const existing = byId || bySerial;

        if (existing) {
          await inventoryApi.update(existing.id, payload);
        } else {
          await inventoryApi.create(payload);
        }

        processed += 1;
      }

      await reload();
      onToast(`Importacion completada: ${processed} procesados, ${skipped} omitidos`);
    } catch {
      onToast("No se pudo importar el archivo de inventario");
    }
  };

  return (
    <div>
      <div style={{ background: T.bgCard, borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden", boxShadow: "0 2px 10px rgba(30,91,181,0.06)" }}>
        <div style={{ padding: "18px 24px", background: T.bgPage, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {!isMobile && <div style={{ width: 3, height: 16, background: T.accent, borderRadius: 2 }} />}
            <span style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>
              Inventario de Equipos
            </span>
            <span style={{ fontSize: 12, background: T.accentPale, color: T.accent, border: `1px solid ${T.borderStrong}`, borderRadius: 10, padding: "1px 10px", fontWeight: 700, fontFamily: "monospace" }}>
              {itemsWithUsers.length}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginLeft: "auto", width: isMobile ? "100%" : "auto" }}>
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportInventoryExcel}
              style={{ display: "none" }}
            />
            <div style={{ position: "relative", minWidth: isMobile ? "100%" : 290, width: isMobile ? "100%" : "auto" }}>
              <ScanBarcode size={15} color={T.textMuted} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
              <input
                value={serialSearch}
                onChange={(event) => setSerialSearch(event.target.value)}
                placeholder="Buscar o escanear numero de serie"
                style={{ width: "100%", background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 12px 9px 34px", color: T.textPrimary, fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none" }}
              />
            </div>
            <button
              onClick={handleExportInventoryExcel}
              style={{ width: isMobile ? "100%" : "auto", justifyContent: "center", background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: T.accent }}
            >
              <Download size={14} /> Exportar Excel
            </button>
            <button
              onClick={() => importInputRef.current?.click()}
              style={{ width: isMobile ? "100%" : "auto", justifyContent: "center", background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: T.accent }}
            >
              <Upload size={14} /> Importar Excel
            </button>
            <button
              onClick={() => {
                setEditingItem(null);
                setShowCreate(true);
              }}
              style={{ width: isMobile ? "100%" : "auto", justifyContent: "center", background: `linear-gradient(135deg, ${T.accent} 0%, ${T.accentLight} 100%)`, color: T.white, border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 10px rgba(30,91,181,0.25)" }}
            >
              <PackagePlus size={14} /> Agregar Equipo
            </button>
          </div>
        </div>

        {isMobile ? (
          <div style={{ display: "grid", gap: 10, padding: 12 }}>
            {itemsWithUsers.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                style={{ border: `1px solid ${T.border}`, borderRadius: 12, padding: 12, background: T.white, cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: T.textPrimary, fontSize: 13 }}>{item.assetName}</div>
                    <div style={{ fontSize: 12, color: T.textSecondary }}>{item.brand} {item.model}</div>
                    <div style={{ fontSize: 12, color: T.textMuted, fontFamily: "monospace", marginTop: 2 }}>{item.serialNumber || "-"}</div>
                  </div>
                  <span style={{ background: item.status === "Activo" ? "#f0fdf4" : "#fffbeb", color: item.status === "Activo" ? T.success : T.warning, borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                    {item.status}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10, fontSize: 12 }}>
                  <div><span style={{ color: T.textMuted }}>Equipo:</span> <span style={{ color: T.textSecondary }}>{item.owningTeam?.name || "Sin equipo"}</span></div>
                  <div><span style={{ color: T.textMuted }}>Asignado:</span> <span style={{ color: T.textSecondary }}>{item.assignedUser?.name || "Sin asignar"}</span></div>
                  <div><span style={{ color: T.textMuted }}>Tickets:</span> <span style={{ color: T.textPrimary, fontWeight: 700 }}>{item.ticketCount || 0}</span></div>
                  <div><span style={{ color: T.textMuted }}>Responsiva:</span> <span style={{ color: item.responsiva ? T.accent : T.textMuted, fontWeight: 700 }}>{item.responsiva ? "PDF" : "No"}</span></div>
                </div>

                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      handleGenerateLabel(item);
                    }}
                    style={{ background: "#eff6ff", border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 10px", cursor: "pointer", color: T.accent, display: "flex", alignItems: "center" }}
                    title="Generar etiqueta PDF"
                  >
                    <ScanBarcode size={13} />
                  </button>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setEditingItem(item);
                      setShowCreate(true);
                    }}
                    style={{ background: T.accentPale, border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 10px", cursor: "pointer", color: T.accent, display: "flex", alignItems: "center" }}
                    title="Editar inventario"
                  >
                    <Edit3 size={13} />
                  </button>
                </div>
              </div>
            ))}
            {itemsWithUsers.length === 0 && (
              <div style={{ padding: 18, textAlign: "center", color: T.textMuted }}>
                No hay equipos registrados en inventario.
              </div>
            )}
          </div>
        ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Equipo", "Pertenece a", "Asignado a", "Serie", "Estado", "Ultimo mantenimiento", "Tickets", "Responsiva", "Comentarios", "Acciones"].map((header) => (
                  <th key={header} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'DM Sans', sans-serif", background: T.bgPage, borderBottom: `1.5px solid ${T.border}`, whiteSpace: "nowrap" }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {itemsWithUsers.map((item, index) => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  style={{ borderBottom: `1px solid ${T.border}`, background: index % 2 === 0 ? T.white : "#fafcff", cursor: "pointer" }}
                >
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: T.accentPale, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Monitor size={16} color={T.accent} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: T.textPrimary }}>{item.assetName}</div>
                        <div style={{ fontSize: 12, color: T.textSecondary }}>{item.brand} {item.model}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", color: T.textSecondary }}>{item.owningTeam?.name || "Sin equipo"}</td>
                  <td style={{ padding: "12px 16px", color: T.textSecondary }}>{item.assignedUser?.name || "Sin asignar"}</td>
                  <td style={{ padding: "12px 16px", color: T.textSecondary, fontFamily: "monospace" }}>{item.serialNumber || "-"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ background: item.status === "Activo" ? "#f0fdf4" : "#fffbeb", color: item.status === "Activo" ? T.success : T.warning, borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                      {item.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", color: T.textSecondary, fontSize: 12 }}>
                    {new Date(item.updatedAt || item.createdAt).toLocaleDateString("es-MX", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td style={{ padding: "12px 16px", color: T.textPrimary, fontWeight: 700 }}>{item.ticketCount || 0}</td>
                  <td style={{ padding: "12px 16px", color: item.responsiva ? T.accent : T.textMuted, fontWeight: 700, fontSize: 12 }}>
                    {item.responsiva ? "PDF cargado" : "Sin PDF"}
                  </td>
                  <td style={{ padding: "12px 16px", color: T.textPrimary, fontWeight: 700 }}>{item.comments?.length || 0}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleGenerateLabel(item);
                        }}
                        style={{ background: "#eff6ff", border: `1px solid ${T.border}`, borderRadius: 6, padding: "5px 8px", cursor: "pointer", color: T.accent, display: "flex", alignItems: "center" }}
                        title="Generar etiqueta PDF"
                      >
                        <ScanBarcode size={13} />
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditingItem(item);
                          setShowCreate(true);
                        }}
                        style={{ background: T.accentPale, border: `1px solid ${T.border}`, borderRadius: 6, padding: "5px 8px", cursor: "pointer", color: T.accent, display: "flex", alignItems: "center" }}
                        title="Editar inventario"
                      >
                        <Edit3 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {itemsWithUsers.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: "28px 16px", textAlign: "center", color: T.textMuted }}>
                    No hay equipos registrados en inventario.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {showCreate && (
        <Modal
          title={editingItem ? "Editar Equipo de Inventario" : "Agregar Equipo al Inventario"}
          onClose={() => setShowCreate(false)}
          width={720}
        >
          <InventoryFormModal
            item={editingItem}
            users={users}
            teams={teams}
            currentUser={currentUser}
            onClose={() => setShowCreate(false)}
            onSuccess={(message) => {
              reload();
              setShowCreate(false);
              onToast(message);
            }}
            onCommentAdded={(message) => {
              reload();
              onToast(message);
            }}
          />
        </Modal>
      )}

      {selectedItem && (
        <Modal title="Detalle del Equipo" onClose={() => setSelectedItem(null)} width={720}>
          <InventoryDetailModal item={selectedItem} onToast={onToast} />
        </Modal>
      )}
    </div>
  );
}

function InventoryDetailModal({ item, onToast }) {
  const detailCard = {
    background: "#f8fbff",
    border: "1px solid #dbeafe",
    borderRadius: 12,
    padding: 16,
  };
  const labelStyle = {
    display: "block",
    marginBottom: 6,
    fontSize: 11,
    fontWeight: 700,
    color: "#8aafd4",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontFamily: "'DM Sans', sans-serif",
  };
  const valueStyle = {
    fontSize: 14,
    color: "#0f2a5e",
    fontWeight: 600,
    wordBreak: "break-word",
  };

  const details = [
    ["Nombre del equipo", item.assetName || "-"],
    ["Equipo propietario", item.owningTeam?.name || "-"],
    ["Categoria", item.assetCategory || "-"],
    ["Marca", item.brand || "-"],
    ["Modelo", item.model || "-"],
    ["Numero de serie", item.serialNumber || "-"],
    ["Estado", item.status || "-"],
    ["Ubicacion", item.location || "-"],
    ["Sistema operativo", item.operatingSystem || "-"],
    ["Procesador", item.processor || "-"],
    ["RAM", item.ram || "-"],
    ["Almacenamiento", item.storage || "-"],
    ["Ultimo mantenimiento", item.updatedAt || item.createdAt ? new Date(item.updatedAt || item.createdAt).toLocaleString("es-MX") : "-"],
    ["Tickets", String(item.ticketCount || 0)],
    ["Comentarios", String(item.comments?.length || 0)],
  ];

  const handleOpenResponsiva = async () => {
    if (item.responsiva?.path) {
      window.open(item.responsiva.path, "_blank", "noopener,noreferrer");
      return;
    }

    if (!item.responsiva?.id) return;

    try {
      const storedFile = await getAttachmentFile(item.responsiva.id);
      if (!storedFile?.file) {
        onToast?.("No se encontro la responsiva del equipo");
        return;
      }

      const url = URL.createObjectURL(storedFile.file);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch {
      onToast?.("No se pudo abrir la responsiva");
    }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={detailCard}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
          {details.map(([label, value]) => (
            <div key={label}>
              <span style={labelStyle}>{label}</span>
              <div style={valueStyle}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={detailCard}>
        <span style={labelStyle}>Notas</span>
        <div style={{ ...valueStyle, fontWeight: 500 }}>{item.notes || "Sin notas registradas."}</div>
      </div>

      <div style={detailCard}>
        <span style={labelStyle}>Responsiva del equipo</span>
        {item.responsiva ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileText size={18} color="#1e5bb5" />
              </div>
              <div>
                <div style={{ ...valueStyle, fontSize: 13 }}>{item.responsiva.name}</div>
                <div style={{ fontSize: 12, color: "#4a6fa5" }}>
                  {(item.responsiva.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenResponsiva}
              style={{ background: "#eff6ff", border: "1px solid #cce0ff", borderRadius: 8, padding: "8px 12px", cursor: "pointer", color: "#1e5bb5", display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}
            >
              <Download size={14} /> Ver PDF
            </button>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "#4a6fa5" }}>No hay responsiva cargada.</div>
        )}
      </div>

      <div style={detailCard}>
        <span style={labelStyle}>Historial de mantenimiento</span>
        <div style={{ display: "grid", gap: 10 }}>
          {(item.comments || []).length === 0 && (
            <div style={{ fontSize: 13, color: "#4a6fa5" }}>No hay mantenimientos registrados.</div>
          )}
          {(item.comments || []).map((savedComment) => (
            <div key={savedComment.id} style={{ background: "#ffffff", border: "1px solid #dbeafe", borderRadius: 10, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0f2a5e" }}>{savedComment.authorName}</span>
                <span style={{ fontSize: 11, color: "#8aafd4" }}>{new Date(savedComment.createdAt).toLocaleString("es-MX")}</span>
              </div>
              <div style={{ fontSize: 13, color: "#4a6fa5" }}>{savedComment.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InventoryFormModal({ item, users, teams, currentUser, onClose, onSuccess, onCommentAdded }) {
  const { isMobile } = useResponsive();
  const isEdit = !!item;
  const [form, setForm] = useState({ ...emptyInventoryForm, ...item });
  const [errors, setErrors] = useState({});
  const [comment, setComment] = useState("");
  const [responsiva, setResponsiva] = useState(item?.responsiva ?? null);
  const [responsivaFile, setResponsivaFile] = useState(null);
  const [responsivaRemoved, setResponsivaRemoved] = useState(false);
  const [responsivaError, setResponsivaError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const validate = () => {
    const nextErrors = {};
    if (!form.assetName.trim()) nextErrors.assetName = "El nombre del equipo es requerido";
    if (!form.assetCategory.trim()) nextErrors.assetCategory = "La categoria es requerida";
    return nextErrors;
  };

  const handleResponsivaSelect = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setResponsivaError("Solo se permite subir archivos PDF.");
      return;
    }

    if (file.size > MAX_RESPONSIVA_SIZE) {
      setResponsivaError("La responsiva no puede superar 5 MB.");
      return;
    }

    setResponsivaError("");
    setResponsivaFile(file);
    setResponsivaRemoved(false);
    setResponsiva({
      id: "temp-responsiva",
      name: file.name,
      size: file.size,
      type: file.type || "application/pdf",
    });
  };

  const handleOpenResponsiva = async () => {
    if (responsivaFile) {
      const url = URL.createObjectURL(responsivaFile);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      return;
    }

    if (responsiva?.path) {
      window.open(responsiva.path, "_blank", "noopener,noreferrer");
      return;
    }

    if (!responsiva?.id || responsiva.id === "temp-responsiva") return;

    try {
      const storedFile = await getAttachmentFile(responsiva.id);
      if (!storedFile?.file) {
        setResponsivaError("No se encontro el PDF almacenado.");
        return;
      }

      const url = URL.createObjectURL(storedFile.file);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch {
      setResponsivaError("No se pudo abrir la responsiva.");
    }
  };

  const handleRemoveResponsiva = () => {
    setResponsivaError("");
    setResponsivaFile(null);
    setResponsiva(null);
    setResponsivaRemoved(true);
  };

  const handleSubmit = async () => {
    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setIsSaving(true);

    try {
      let nextResponsiva = responsivaRemoved ? null : item?.responsiva ?? null;

      if (!isBackendEnabled() && responsivaFile) {
        const savedFile = await saveAttachmentFile(responsivaFile);
        nextResponsiva = {
          id: savedFile.id,
          name: savedFile.name,
          size: savedFile.size,
          type: savedFile.type,
          uploadedAt: savedFile.createdAt,
        };
      }

      const payload = {
        assignedUserId: form.assignedUserId || null,
        owningTeamId: form.owningTeamId || null,
        assetName: form.assetName.trim(),
        assetCategory: form.assetCategory.trim(),
        brand: form.brand.trim(),
        model: form.model.trim(),
        serialNumber: form.serialNumber.trim(),
        operatingSystem: form.operatingSystem.trim(),
        processor: form.processor.trim(),
        ram: form.ram.trim(),
        storage: form.storage.trim(),
        location: form.location.trim(),
        status: form.status,
        notes: form.notes.trim(),
      };

      if (isEdit) {
        await inventoryApi.update(item.id, payload);

        if (isBackendEnabled() && responsivaFile) {
          const updatedWithFile = await inventoryApi.uploadResponsiva(item.id, responsivaFile);
          nextResponsiva = updatedWithFile?.responsiva || nextResponsiva;
        }
        logAuditEntry({
          actorId: currentUser.id,
          actorName: currentUser.name,
          action: "actualizacion",
          entityType: "inventario",
          entityId: item.id,
          summary: `Equipo actualizado: ${payload.assetName}`,
          details: `Serie: ${payload.serialNumber || "-"} · Estado: ${payload.status}${nextResponsiva ? " · Responsiva cargada" : " · Sin responsiva"}`,
        });

        if (!isBackendEnabled() && (responsivaRemoved || responsivaFile) && item?.responsiva?.id) {
          await deleteAttachmentFile(item.responsiva.id);
        }

        onSuccess("Equipo actualizado en inventario");
        return;
      }

      const createdItem = await inventoryApi.create({ ...payload, revisions: 0, comments: [] });
      if (isBackendEnabled() && responsivaFile) {
        const updatedWithFile = await inventoryApi.uploadResponsiva(createdItem.id, responsivaFile);
        nextResponsiva = updatedWithFile?.responsiva || nextResponsiva;
      }
      logAuditEntry({
        actorId: currentUser.id,
        actorName: currentUser.name,
        action: "creacion",
        entityType: "inventario",
        entityId: createdItem.id,
        summary: `Equipo agregado: ${payload.assetName}`,
        details: `Serie: ${payload.serialNumber || "-"} · Asignado a: ${payload.assignedUserId || "sin asignar"}${nextResponsiva ? " · Responsiva cargada" : ""}`,
      });
      onSuccess("Equipo agregado al inventario");
    } catch {
      setResponsivaError("No se pudo guardar la responsiva del equipo.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim() || !item?.id) return;

    await inventoryApi.addComment(item.id, {
      authorId: currentUser.id,
      authorName: currentUser.name,
      text: comment.trim(),
    });
    logAuditEntry({
      actorId: currentUser.id,
      actorName: currentUser.name,
      action: "mantenimiento",
      entityType: "inventario",
      entityId: item.id,
      summary: `Mantenimiento registrado para ${item.assetName}`,
      details: comment.trim(),
    });
    setComment("");
    onCommentAdded("Comentario agregado al inventario");
  };

  const inputSt = {
    width: "100%",
    background: "#f8fbff",
    border: "1.5px solid #cce0ff",
    borderRadius: 9,
    padding: "11px 14px",
    color: "#0f2a5e",
    fontSize: 13,
    fontFamily: "'DM Sans', sans-serif",
    outline: "none",
    boxSizing: "border-box",
  };
  const lblSt = {
    display: "block",
    marginBottom: 6,
    fontSize: 11,
    fontWeight: 700,
    color: "#8aafd4",
    textTransform: "uppercase",
    letterSpacing: "0.09em",
    fontFamily: "'DM Sans', sans-serif",
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
        <Field label="Nombre del equipo" error={errors.assetName} labelStyle={lblSt}>
          <input value={form.assetName} onChange={set("assetName")} style={inputSt} placeholder="Ej. Laptop Lenovo T14" />
        </Field>
        <Field label="Categoria" error={errors.assetCategory} labelStyle={lblSt}>
          <select value={form.assetCategory} onChange={set("assetCategory")} style={{ ...inputSt, cursor: "pointer" }}>
            {["Laptop", "Desktop", "Monitor", "Impresora", "Tablet", "Accesorio", "Otro"].map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </Field>
        <Field label="Usuario asignado" labelStyle={lblSt}>
          <select value={form.assignedUserId || ""} onChange={set("assignedUserId")} style={{ ...inputSt, cursor: "pointer" }}>
            <option value="">Sin asignar</option>
            {users.filter((user) => user.role !== "support").map((user) => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Equipo propietario" labelStyle={lblSt}>
          <select value={form.owningTeamId || ""} onChange={set("owningTeamId")} style={{ ...inputSt, cursor: "pointer" }}>
            <option value="">Sin equipo</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Estado" labelStyle={lblSt}>
          <select value={form.status} onChange={set("status")} style={{ ...inputSt, cursor: "pointer" }}>
            {["Activo", "En revision", "Resguardo", "Baja"].map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </Field>
        <Field label="Marca" labelStyle={lblSt}>
          <input value={form.brand} onChange={set("brand")} style={inputSt} />
        </Field>
        <Field label="Modelo" labelStyle={lblSt}>
          <input value={form.model} onChange={set("model")} style={inputSt} />
        </Field>
        <Field label="No. de serie" labelStyle={lblSt}>
          <input value={form.serialNumber} onChange={set("serialNumber")} style={inputSt} />
        </Field>
        <Field label="Ubicacion" labelStyle={lblSt}>
          <input value={form.location} onChange={set("location")} style={inputSt} />
        </Field>
        <Field label="Sistema operativo" labelStyle={lblSt}>
          <input value={form.operatingSystem} onChange={set("operatingSystem")} style={inputSt} />
        </Field>
        <Field label="Procesador" labelStyle={lblSt}>
          <input value={form.processor} onChange={set("processor")} style={inputSt} />
        </Field>
        <Field label="RAM" labelStyle={lblSt}>
          <input value={form.ram} onChange={set("ram")} style={inputSt} />
        </Field>
        <Field label="Almacenamiento" labelStyle={lblSt}>
          <input value={form.storage} onChange={set("storage")} style={inputSt} />
        </Field>
      </div>

      <Field label="Caracteristicas / notas" labelStyle={lblSt}>
        <textarea value={form.notes} onChange={set("notes")} style={{ ...inputSt, minHeight: 90, resize: "vertical" }} />
      </Field>

      <Field label="Responsiva del equipo (PDF max. 5 MB)" error={responsivaError} labelStyle={lblSt}>
        <div style={{ background: "#f8fbff", border: "1.5px dashed #93c5fd", borderRadius: 12, padding: 14 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            hidden
            onChange={handleResponsivaSelect}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ color: "#4a6fa5", fontSize: 13 }}>
              {responsiva ? "PDF listo para este registro." : "No hay PDF cargado para este registro."}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{ background: "#eff6ff", border: "1px solid #cce0ff", borderRadius: 8, padding: "8px 12px", cursor: "pointer", color: "#1e5bb5", display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}
            >
              <Upload size={14} /> {responsiva ? "Reemplazar PDF" : "Subir PDF"}
            </button>
          </div>
          {responsiva && (
            <div style={{ marginTop: 12, background: "#ffffff", border: "1px solid #dbeafe", borderRadius: 10, padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FileText size={16} color="#1e5bb5" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f2a5e" }}>{responsiva.name}</div>
                  <div style={{ fontSize: 12, color: "#4a6fa5" }}>{(responsiva.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleOpenResponsiva}
                  style={{ background: "#eff6ff", border: "1px solid #cce0ff", borderRadius: 8, padding: "8px 12px", cursor: "pointer", color: "#1e5bb5", display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}
                >
                  <Download size={14} /> Ver PDF
                </button>
                <button
                  type="button"
                  onClick={handleRemoveResponsiva}
                  style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", cursor: "pointer", color: "#dc2626", display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}
                >
                  <Trash2 size={14} /> Quitar
                </button>
              </div>
            </div>
          )}
        </div>
      </Field>

      {isEdit && (
        <div style={{ background: "#f8fbff", border: "1px solid #dbeafe", borderRadius: 12, padding: 14, marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#4a6fa5" }}>Agregar mantenimiento</span>
            <span style={{ fontSize: 12, color: "#8aafd4" }}>Mantenimientos: {item.comments?.length || 0}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 180, overflowY: "auto", marginBottom: 10 }}>
            {(item.comments || []).length === 0 && (
              <span style={{ fontSize: 12, color: "#8aafd4" }}>Sin mantenimientos registrados todavia.</span>
            )}
            {(item.comments || []).map((savedComment) => (
              <div key={savedComment.id} style={{ background: "#ffffff", border: "1px solid #dbeafe", borderRadius: 10, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#0f2a5e" }}>{savedComment.authorName}</span>
                  <span style={{ fontSize: 11, color: "#8aafd4" }}>{new Date(savedComment.createdAt).toLocaleString("es-MX")}</span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: "#4a6fa5" }}>{savedComment.text}</p>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, flexDirection: isMobile ? "column" : "row" }}>
            <input
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Describe el mantenimiento realizado..."
              style={{ ...inputSt, flex: 1 }}
            />
            <button onClick={handleAddComment} style={{ background: "#1e5bb5", color: "#fff", border: "none", borderRadius: 8, padding: isMobile ? "10px 14px" : "0 14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <MessageSquarePlus size={14} /> Agregar mantenimiento
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexDirection: isMobile ? "column-reverse" : "row" }}>
        <button onClick={onClose} style={{ width: isMobile ? "100%" : "auto", background: "#f8fbff", border: "1.5px solid #cce0ff", borderRadius: 8, padding: "10px 20px", color: "#4a6fa5", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
          Cancelar
        </button>
        <button onClick={handleSubmit} disabled={isSaving} style={{ width: isMobile ? "100%" : "auto", background: "linear-gradient(135deg, #1e5bb5 0%, #4a90d9 100%)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: isSaving ? "wait" : "pointer", opacity: isSaving ? 0.75 : 1 }}>
          {isSaving ? "Guardando..." : isEdit ? "Guardar Cambios" : "Crear Equipo"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, error, children, labelStyle }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>
      {children}
      {error && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#dc2626" }}>{error}</p>}
    </div>
  );
}
