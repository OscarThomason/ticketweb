import { useRef, useState } from "react";
import { Paperclip, Plus, Upload, X } from "lucide-react";
import Input from "../../../shared/components/Input.jsx";
import Select from "../../../shared/components/Select.jsx";
import Textarea from "../../../shared/components/Textarea.jsx";
import Button from "../../../shared/components/Button.jsx";
import {
  ACTIVITY_OPTIONS,
  CATEGORIES,
  PRIORITIES,
} from "../../../shared/utils/tickets.js";
import { useAuth } from "../../../app/providers/auth-context.js";
import {
  deleteAttachmentFile,
  saveAttachmentFile,
} from "../attachments/attachments.store.js";
import { useCreateTicket } from "../hooks/use-ticket-mutations.js";

const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;

const FORM_THEME = {
  fieldBg: "#eaf4ff",
  fieldBorder: "#bfdcff",
  fieldBorderFocus: "#4a90d9",
  fieldText: "#123766",
  fieldPlaceholder: "#5d7fa8",
  label: "#4a6fa5",
};

export default function TicketForm({ onClose, onSuccess }) {
  const { currentUser } = useAuth();
  const canChoosePriority = currentUser?.role === "support";
  const fileInputRef = useRef(null);
  const createTicket = useCreateTicket({
    onSuccess: () => {
      onSuccess?.("Ticket creado exitosamente");
      onClose();
    },
  });

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: CATEGORIES[0],
    priority: "Media",
    activity: "No",
    attachments: [],
  });
  const [errors, setErrors] = useState({});
  const [attachmentError, setAttachmentError] = useState("");

  const validate = () => {
    const nextErrors = {};

    if (!form.title.trim()) nextErrors.title = "El titulo es requerido";
    if (!form.description.trim()) nextErrors.description = "La descripcion es requerida";

    return nextErrors;
  };

  const handleSubmit = () => {
    const nextErrors = validate();

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    const nextFormData = canChoosePriority
      ? form
      : { ...form, priority: "Media" };

    createTicket.mutate({ formData: nextFormData, currentUser });
  };

  const handleFileSelect = async (event) => {
    const selectedFiles = Array.from(event.target.files ?? []);

    if (selectedFiles.length === 0) return;

    setAttachmentError("");

    const validAttachments = [];

    for (const file of selectedFiles) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        setAttachmentError(`El archivo "${file.name}" supera el límite de 5 MB.`);
        continue;
      }

      const savedAttachment = await saveAttachmentFile(file);
      validAttachments.push({
        id: savedAttachment.id,
        name: savedAttachment.name,
        size: savedAttachment.size,
        type: savedAttachment.type,
      });
    }

    if (validAttachments.length > 0) {
      setForm((prev) => ({
        ...prev,
        attachments: [...prev.attachments, ...validAttachments],
      }));
    }

    event.target.value = "";
  };

  const removeAttachment = async (attachmentId) => {
    await deleteAttachmentFile(attachmentId);
    setForm((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((attachment) => attachment.id !== attachmentId),
    }));
  };

  return (
    <div>
      <Input
        label="Titulo *"
        placeholder="Describe brevemente el problema..."
        value={form.title}
        onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
        labelStyle={{ color: FORM_THEME.label, fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700 }}
        style={{
          background: FORM_THEME.fieldBg,
          border: `1px solid ${FORM_THEME.fieldBorder}`,
          borderRadius: 10,
          color: FORM_THEME.fieldText,
          fontFamily: "'DM Sans', sans-serif",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65)",
        }}
      />
      {errors.title && <p style={{ color: "#ef4444", fontSize: 12, marginTop: -12, marginBottom: 12 }}>{errors.title}</p>}

      <Textarea
        label="Descripcion *"
        placeholder="Explica el problema con detalle..."
        value={form.description}
        onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
        labelStyle={{ color: FORM_THEME.label, fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700 }}
        style={{
          minHeight: 120,
          background: FORM_THEME.fieldBg,
          border: `1px solid ${FORM_THEME.fieldBorder}`,
          borderRadius: 10,
          color: FORM_THEME.fieldText,
          fontFamily: "'DM Sans', sans-serif",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65)",
        }}
      />
      {errors.description && <p style={{ color: "#ef4444", fontSize: 12, marginTop: -12, marginBottom: 12 }}>{errors.description}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
        <Select
          label="Categoria"
          value={form.category}
          onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
          options={CATEGORIES}
          labelStyle={{ color: FORM_THEME.label, fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700 }}
          style={{
            background: FORM_THEME.fieldBg,
            border: `1px solid ${FORM_THEME.fieldBorder}`,
            borderRadius: 10,
            color: FORM_THEME.fieldText,
            fontFamily: "'DM Sans', sans-serif",
          }}
        />
        <div title={!canChoosePriority ? "La prioridad la concede support" : ""}>
          <Select
            label="Prioridad"
            value={form.priority}
            onChange={(event) => canChoosePriority && setForm((prev) => ({ ...prev, priority: event.target.value }))}
            options={PRIORITIES}
            disabled={!canChoosePriority}
            labelStyle={{ color: FORM_THEME.label, fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700 }}
            style={{
              background: FORM_THEME.fieldBg,
              border: `1px solid ${FORM_THEME.fieldBorder}`,
              borderRadius: 10,
              color: FORM_THEME.fieldText,
              fontFamily: "'DM Sans', sans-serif",
              opacity: canChoosePriority ? 1 : 0.75,
              cursor: canChoosePriority ? "pointer" : "not-allowed",
            }}
          />
        </div>
        <Select
          label="Te impide trabajar?"
          value={form.activity}
          onChange={(event) => setForm((prev) => ({ ...prev, activity: event.target.value }))}
          options={ACTIVITY_OPTIONS}
          labelStyle={{ color: FORM_THEME.label, fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700 }}
          style={{
            background: FORM_THEME.fieldBg,
            border: `1px solid ${FORM_THEME.fieldBorder}`,
            borderRadius: 10,
            color: FORM_THEME.fieldText,
            fontFamily: "'DM Sans', sans-serif",
          }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 6, fontSize: 11, fontWeight: 700, color: FORM_THEME.label, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'DM Sans', sans-serif" }}>
          Archivos adjuntos
        </label>
        <div
          style={{ background: "#eef6ff", border: "1.5px dashed #93c5fd", borderRadius: 12, padding: 18, textAlign: "center", cursor: "pointer", color: FORM_THEME.fieldPlaceholder, fontSize: 13, transition: "border-color 0.2s, background 0.2s" }}
          onClick={() => fileInputRef.current?.click()}
          onMouseEnter={(event) => {
            event.currentTarget.style.borderColor = FORM_THEME.fieldBorderFocus;
            event.currentTarget.style.background = "#e2f0ff";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.borderColor = "#93c5fd";
            event.currentTarget.style.background = "#eef6ff";
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={handleFileSelect}
          />
          <Upload size={18} style={{ display: "inline", marginRight: 6, color: FORM_THEME.fieldBorderFocus }} />
          Selecciona uno o varios archivos
          <div style={{ marginTop: 6, fontSize: 12, color: FORM_THEME.fieldPlaceholder }}>
            Tamaño máximo por archivo: 5 MB
          </div>
          {form.attachments.length > 0 && (
            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {form.attachments.map((attachment, index) => (
                <div key={`${attachment.id}-${index}`} style={{ display: "flex", alignItems: "center", gap: 6, background: "#ffffff", border: "1px solid #bfdcff", borderRadius: 999, padding: "6px 10px", fontSize: 11, color: FORM_THEME.fieldText, boxShadow: "0 4px 10px rgba(30,91,181,0.08)" }}>
                  <Paperclip size={12} color={FORM_THEME.fieldBorderFocus} />
                  <span style={{ fontWeight: 600 }}>{attachment.name}</span>
                  <span style={{ color: FORM_THEME.fieldPlaceholder }}>
                    ({(attachment.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      removeAttachment(attachment.id);
                    }}
                    style={{ background: "none", border: "none", padding: 0, display: "flex", cursor: "pointer", color: FORM_THEME.fieldPlaceholder }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {attachmentError && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 8 }}>{attachmentError}</p>}
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", paddingTop: 8 }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={createTicket.isPending}>
          <Plus size={15} /> {createTicket.isPending ? "Creando..." : "Crear Ticket"}
        </Button>
      </div>
    </div>
  );
}
