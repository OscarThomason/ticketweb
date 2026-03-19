import { useState } from "react";
import { Check, Circle, Download, Edit3, Paperclip, Send } from "lucide-react";
import Badge from "../../../shared/components/Badge.jsx";
import Button from "../../../shared/components/Button.jsx";
import Select from "../../../shared/components/Select.jsx";
import Textarea from "../../../shared/components/Textarea.jsx";
import Avatar from "../../../shared/components/Avatar.jsx";
import {
  formatDate,
  formatDateTime,
  PRIORITIES,
  STATUS_CONFIG,
  STATUSES,
} from "../../../shared/utils/tickets.js";
import { useAuth } from "../../../app/providers/auth-context.js";
import { useTicketDetail, useUsers } from "../../../services/tickets/hooks/use-tickets.js";
import {
  useAddComment,
  useUpdateTicket,
  useUpdateTicketStatus,
} from "../../../services/tickets/hooks/use-ticket-mutations.js";
import { getAttachmentFile } from "../../../services/tickets/attachments/attachments.store.js";

const T = {
  panel: "#ffffff",
  panelMuted: "#f8fbff",
  border: "#dbeafe",
  borderStrong: "#bfdbfe",
  textPrimary: "#0f2a5e",
  textSecondary: "#4a6fa5",
  textMuted: "#8aafd4",
  accent: "#1e5bb5",
  accentSoft: "#dbeafe",
};
const editorInputStyle = {
  background: "#ffffff",
  border: `1px solid ${T.borderStrong}`,
  color: T.textPrimary,
  borderRadius: 10,
  boxShadow: "inset 0 1px 2px rgba(30,91,181,0.04)",
};
const editorLabelStyle = {
  color: T.textPrimary,
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
};
const editorSecondaryButtonStyle = {
  background: T.panel,
  color: T.textSecondary,
  border: `1px solid ${T.borderStrong}`,
  borderRadius: 8,
};

export default function TicketDetail({ ticketId, canChangeStatus, canComment, onUpdate }) {
  const { currentUser } = useAuth();
  const { data: ticket } = useTicketDetail(ticketId);
  const { data: users = [] } = useUsers();
  const [newStatus, setNewStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [comment, setComment] = useState("");
  const [showStatusEditor, setShowStatusEditor] = useState(false);
  const [showPriorityEditor, setShowPriorityEditor] = useState(false);
  const [newPriority, setNewPriority] = useState("");

  const statusMutation = useUpdateTicketStatus({
    onSuccess: () => {
      setShowStatusEditor(false);
      setNewStatus("");
      setStatusNote("");
      onUpdate?.();
    },
  });

  const priorityMutation = useUpdateTicket({
    onSuccess: () => {
      setShowPriorityEditor(false);
      setNewPriority("");
      onUpdate?.();
    },
  });

  const commentMutation = useAddComment({
    onSuccess: () => {
      setComment("");
      onUpdate?.();
    },
  });

  if (!ticket) return null;

  const creator = users.find((user) => user.id === ticket.createdBy);

  const handleStatusChange = () => {
    if (!newStatus || !statusNote.trim()) return;

    statusMutation.mutate({
      ticketId: ticket.id,
      newStatus,
      changedBy: currentUser.id,
      note: statusNote,
    });
  };

  const handlePriorityChange = () => {
    if (!newPriority) return;

    priorityMutation.mutate({
      ticketId: ticket.id,
      updates: { priority: newPriority },
    });
  };

  const handleComment = () => {
    if (!comment.trim()) return;

    commentMutation.mutate({
      ticketId: ticket.id,
      comment: {
        authorId: currentUser.id,
        authorRole: currentUser.role,
        text: comment,
      },
    });
  };

  const handleAttachmentDownload = async (attachment) => {
    if (!attachment?.id) return;

    const storedAttachment = await getAttachmentFile(attachment.id);

    if (!storedAttachment?.file) return;

    const downloadUrl = URL.createObjectURL(storedAttachment.file);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = attachment.name || storedAttachment.name || "adjunto";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <Badge status={ticket.status} type="status" />
        <Badge status={ticket.priority} type="priority" />
        {ticket.activity === "Sí" && (
          <span style={{ background: "#ef444415", color: "#ef4444", border: "1px solid #ef444430", borderRadius: 999, padding: "4px 12px", fontSize: 11, fontWeight: 700 }}>
            IMPIDE TRABAJAR
          </span>
        )}
        <span style={{ fontFamily: "monospace", fontSize: 12, color: T.textMuted, marginLeft: "auto" }}>
          #{ticket.id}
        </span>
      </div>

      <div style={{ background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)", borderRadius: 14, overflow: "hidden", padding: 20, marginBottom: 20, border: `1px solid ${T.border}`, boxShadow: "0 12px 28px rgba(30,91,181,0.08)" }}>
        <p style={{ margin: "0 0 14px", color: T.textSecondary, fontSize: 13, lineHeight: 1.7 }}>
          {ticket.description}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            ["Categoria", ticket.category],
            ["Actividad", ticket.activity === "Sí" ? "Impide trabajar" : "No impide trabajar"],
            ["Creado por", creator?.name || "-"],
            ["Fecha", formatDate(ticket.createdAt)],
          ].map(([label, value]) => (
            <div key={label}>
              <p style={{ margin: "0 0 2px", fontSize: 11, color: T.textMuted, fontFamily: "monospace", textTransform: "uppercase" }}>
                {label}
              </p>
              <p style={{ margin: 0, fontSize: 13, color: T.textPrimary, fontWeight: 600 }}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {ticket.attachments?.length > 0 && (
          <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {ticket.attachments.map((attachment, index) => (
              typeof attachment === "string" ? (
                <span key={`${attachment}-${index}`} style={{ background: T.accentSoft, border: `1px solid ${T.borderStrong}`, borderRadius: 999, padding: "4px 10px", fontSize: 11, color: T.accent, display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
                  <Paperclip size={10} />
                  {attachment}
                </span>
              ) : (
                <button
                  key={`${attachment.id}-${index}`}
                  type="button"
                  onClick={() => handleAttachmentDownload(attachment)}
                  style={{ background: T.accentSoft, border: `1px solid ${T.borderStrong}`, borderRadius: 999, padding: "6px 10px", fontSize: 11, color: T.accent, display: "flex", alignItems: "center", gap: 6, fontWeight: 600, cursor: "pointer" }}
                >
                  <Paperclip size={10} />
                  {attachment.name}
                  <span style={{ color: T.textSecondary }}>
                    ({(attachment.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                  <Download size={11} />
                </button>
              )
            ))}
          </div>
        )}
      </div>

      {canChangeStatus && currentUser.role === "support" && (
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          {!showStatusEditor && !showPriorityEditor ? (
            <>
              <Button variant="secondary" size="sm" style={editorSecondaryButtonStyle} onClick={() => setShowStatusEditor(true)}>
                <Edit3 size={14} /> Estado
              </Button>
              <Button variant="secondary" size="sm" style={editorSecondaryButtonStyle} onClick={() => setShowPriorityEditor(true)}>
                <Edit3 size={14} /> Prioridad
              </Button>
            </>
          ) : showStatusEditor ? (
            <div style={{ flex: 1, background: T.panelMuted, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", padding: 16 }}>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: T.textSecondary, fontWeight: 600 }}>
                Cambiar estado del ticket
              </p>
              <Select
                label="Nuevo Estado"
                value={newStatus}
                onChange={(event) => setNewStatus(event.target.value)}
                options={[{ value: "", label: "Seleccionar..." }, ...STATUSES.map((status) => ({ value: status, label: status }))]}
                style={editorInputStyle}
                labelStyle={editorLabelStyle}
                focusBorderColor={T.accent}
                blurBorderColor={T.borderStrong}
              />
              <Textarea
                label="Nota requerida"
                placeholder="Explica el motivo del cambio..."
                value={statusNote}
                onChange={(event) => setStatusNote(event.target.value)}
                style={{ ...editorInputStyle, minHeight: 70 }}
                labelStyle={editorLabelStyle}
                focusBorderColor={T.accent}
                blurBorderColor={T.borderStrong}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <Button size="sm" disabled={!newStatus || !statusNote.trim() || statusMutation.isPending} onClick={handleStatusChange}>
                  <Check size={13} /> Confirmar
                </Button>
                <Button variant="secondary" size="sm" style={editorSecondaryButtonStyle} onClick={() => setShowStatusEditor(false)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, background: T.panelMuted, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", padding: 16 }}>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: T.textSecondary, fontWeight: 600 }}>
                Cambiar prioridad del ticket
              </p>
              <Select
                label="Nueva Prioridad"
                value={newPriority}
                onChange={(event) => setNewPriority(event.target.value)}
                options={[{ value: "", label: "Seleccionar..." }, ...PRIORITIES.map((priority) => ({ value: priority, label: priority }))]}
                style={editorInputStyle}
                labelStyle={editorLabelStyle}
                focusBorderColor={T.accent}
                blurBorderColor={T.borderStrong}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <Button size="sm" disabled={!newPriority || priorityMutation.isPending} onClick={handlePriorityChange}>
                  <Check size={13} /> Confirmar
                </Button>
                <Button variant="secondary" size="sm" style={editorSecondaryButtonStyle} onClick={() => setShowPriorityEditor(false)}>Cancelar</Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace" }}>
          Historial de Estado
        </p>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {[...ticket.statusHistory].reverse().map((history, index) => {
            const config = STATUS_CONFIG[history.status];
            const author = users.find((user) => user.id === history.changedBy);

            return (
              <div key={`${history.changedAt}-${index}`} style={{ display: "flex", gap: 12, paddingBottom: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: config?.bg || T.panelMuted, border: `1.5px solid ${config?.color || T.borderStrong}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Circle size={8} fill={config?.color} color={config?.color} />
                  </div>
                  {index < ticket.statusHistory.length - 1 && (
                    <div style={{ width: 1, flex: 1, background: T.borderStrong, marginTop: 4 }} />
                  )}
                </div>

                <div style={{ paddingBottom: 4 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: config?.color }}>
                      {history.status}
                    </span>
                    <span style={{ fontSize: 11, color: T.textMuted, fontFamily: "monospace" }}>
                      {formatDateTime(history.changedAt)}
                    </span>
                  </div>
                  {history.note && <p style={{ margin: "0 0 2px", fontSize: 12, color: T.textSecondary }}>{history.note}</p>}
                  <p style={{ margin: 0, fontSize: 11, color: T.textMuted }}>por {author?.name || "Sistema"}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace" }}>
          Comentarios ({ticket.comments.length})
        </p>

        {ticket.comments.length === 0 && (
          <p style={{ color: T.textMuted, fontSize: 13, textAlign: "center", padding: "16px 0" }}>
            Sin comentarios aun
          </p>
        )}

        {ticket.comments.map((ticketComment) => {
          const author = users.find((user) => user.id === ticketComment.authorId);
          const color = ticketComment.authorRole === "support"
            ? "#1e5bb5"
            : ticketComment.authorRole === "supervisor"
              ? "#7c3aed"
              : "#4a6fa5";

          return (
            <div key={ticketComment.id} style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: 12, marginBottom: 8, boxShadow: "0 8px 18px rgba(30,91,181,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Avatar initials={author?.avatar || "??"} size={24} color={color} />
                <span style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>
                  {author?.name || "Desconocido"}
                </span>
                <span style={{ fontSize: 11, color: T.textMuted, marginLeft: "auto", fontFamily: "monospace" }}>
                  {formatDateTime(ticketComment.createdAt)}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: T.textSecondary, lineHeight: 1.6 }}>
                {ticketComment.text}
              </p>
            </div>
          );
        })}

        {canComment && (
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <input
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Escribe un comentario..."
              onKeyDown={(event) => event.key === "Enter" && !event.shiftKey && handleComment()}
              style={{ flex: 1, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", color: T.textPrimary, fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none" }}
              onFocus={(event) => (event.target.style.borderColor = T.accent)}
              onBlur={(event) => (event.target.style.borderColor = T.border)}
            />
            <Button onClick={handleComment} disabled={commentMutation.isPending} style={{ padding: "10px 14px" }}>
              <Send size={15} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
