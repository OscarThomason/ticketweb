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
import { useResponsive } from "../../../shared/hooks/use-responsive.js";
import { isBackendEnabled } from "../../api/http-client.js";
import {
  deleteAttachmentFile,
  saveAttachmentFile,
} from "../attachments/attachments.store.js";
import { useCreateTicket } from "../hooks/use-ticket-mutations.js";

const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const ALLOWED_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg"];

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
  const { isMobile } = useResponsive();
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
  const [showPriorityHelp, setShowPriorityHelp] = useState(false);

  const validate = () => {
    const nextErrors = {};

    if (!form.title.trim()) nextErrors.title = "El título es requerido";
    if (!form.description.trim()) nextErrors.description = "La descripción es requerida";

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
    const file = event.target.files?.[0];

    if (!file) return;

    setAttachmentError("");

    const isAllowedType =
      ALLOWED_IMAGE_TYPES.includes(file.type)
      || ALLOWED_IMAGE_EXTENSIONS.some((extension) => file.name.toLowerCase().endsWith(extension));

    if (!isAllowedType) {
      setAttachmentError("Solo se permite una imagen PNG o JPG.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_ATTACHMENT_SIZE) {
      setAttachmentError(`El archivo "${file.name}" supera el límite de 5 MB.`);
      event.target.value = "";
      return;
    }

    if (isBackendEnabled()) {
      setForm((prev) => ({
        ...prev,
        attachments: [{
          id: `temp-${Date.now()}`,
          name: file.name,
          size: file.size,
          type: file.type || "image/jpeg",
          file,
        }],
      }));
      event.target.value = "";
      return;
    }

    const savedAttachment = await saveAttachmentFile(file);
    setForm((prev) => ({
      ...prev,
      attachments: [{
        id: savedAttachment.id,
        name: savedAttachment.name,
        size: savedAttachment.size,
        type: savedAttachment.type,
      }],
    }));

    event.target.value = "";
  };

  const removeAttachment = async (attachmentId) => {
    if (!isBackendEnabled()) {
      await deleteAttachmentFile(attachmentId);
    }
    setForm((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((attachment) => attachment.id !== attachmentId),
    }));
  };

  return (
    <div>
      <Input
        label="Título *"
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
        label="Descripción *"
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

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 16 }}>
        <Select
          label="Categoría"
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
        <div
          style={{ position: "relative" }}
          onMouseEnter={() => !canChoosePriority && setShowPriorityHelp(true)}
          onMouseLeave={() => !canChoosePriority && setShowPriorityHelp(false)}
        >
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
          {!canChoosePriority && showPriorityHelp && (
            <div
              style={{
                position: "absolute",
                left: "50%",
                bottom: "calc(100% + 8px)",
                transform: "translateX(-50%)",
                background: "#123766",
                color: "#ffffff",
                padding: "8px 10px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                lineHeight: 1.3,
                whiteSpace: isMobile ? "normal" : "nowrap",
                boxShadow: "0 8px 18px rgba(18,55,102,0.22)",
                zIndex: 20,
                pointerEvents: "none",
              }}
            >
              La prioridad la asigna support
            </div>
          )}
        </div>
        <Select
          label="¿Te impide trabajar?"
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
          Captura adjunta
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
            accept=".png,.jpg,.jpeg,image/png,image/jpeg"
            hidden
            onChange={handleFileSelect}
          />
          <Upload size={18} style={{ display: "inline", marginRight: 6, color: FORM_THEME.fieldBorderFocus }} />
          Selecciona una imagen
          <div style={{ marginTop: 6, fontSize: 12, color: FORM_THEME.fieldPlaceholder, lineHeight: 1.5 }}>
            PNG o JPG, máximo 5 MB, solo un archivo
          </div>
          {form.attachments.length > 0 && (
            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {form.attachments.map((attachment, index) => (
                <div key={`${attachment.id}-${index}`} style={{ display: "flex", alignItems: "center", gap: 6, background: "#ffffff", border: "1px solid #bfdcff", borderRadius: isMobile ? 14 : 999, padding: "6px 10px", fontSize: 11, color: FORM_THEME.fieldText, boxShadow: "0 4px 10px rgba(30,91,181,0.08)", maxWidth: "100%", flexWrap: "wrap", justifyContent: "center" }}>
                  <Paperclip size={12} color={FORM_THEME.fieldBorderFocus} />
                  <span style={{ fontWeight: 600, wordBreak: "break-word" }}>{attachment.name}</span>
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

      <div style={{ display: "flex", flexDirection: isMobile ? "column-reverse" : "row", gap: 12, justifyContent: "flex-end", paddingTop: 8 }}>
        <Button variant="secondary" onClick={onClose} style={isMobile ? { width: "100%" } : undefined}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={createTicket.isPending} style={isMobile ? { width: "100%" } : undefined}>
          <Plus size={15} /> {createTicket.isPending ? "Creando..." : "Crear Ticket"}
        </Button>
      </div>
    </div>
  );
}
