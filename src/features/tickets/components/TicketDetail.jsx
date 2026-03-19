import { useState } from "react";
import { Check, Circle, Download, Edit3, Paperclip, Send, Star } from "lucide-react";
import Badge from "../../../shared/components/Badge.jsx";
import Button from "../../../shared/components/Button.jsx";
import Select from "../../../shared/components/Select.jsx";
import Textarea from "../../../shared/components/Textarea.jsx";
import Avatar from "../../../shared/components/Avatar.jsx";
import BrandMark from "../../../shared/components/BrandMark.jsx";
import {
  formatDate,
  formatDateTime,
  getTicketDisplayId,
  PRIORITIES,
  STATUS_CONFIG,
  STATUSES,
} from "../../../shared/utils/tickets.js";
import { useAuth } from "../../../app/providers/auth-context.js";
import { useTicketDetail, useTeams, useUsers } from "../../../services/tickets/hooks/use-tickets.js";
import {
  useAddComment,
  useRateTicketSupport,
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

function isBlockingActivity(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim() === "si";
}

export default function TicketDetail({ ticketId, canChangeStatus, canComment, onUpdate, knownUsers = [] }) {
  const { currentUser } = useAuth();
  const { data: ticket } = useTicketDetail(ticketId);
  const { data: users = [] } = useUsers();
  const { data: teams = [] } = useTeams();
  const [newStatus, setNewStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [comment, setComment] = useState("");
  const [showStatusEditor, setShowStatusEditor] = useState(false);
  const [showPriorityEditor, setShowPriorityEditor] = useState(false);
  const [newPriority, setNewPriority] = useState("");
  const [ratingHover, setRatingHover] = useState(0);
  const [optimisticRating, setOptimisticRating] = useState(null);

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

  const rateSupportMutation = useRateTicketSupport({
    onSuccess: () => {
      setRatingHover(0);
      setOptimisticRating((current) => current ?? Number(displayTicket?.supportRating || 0));
      onUpdate?.();
    },
    onError: () => {
      setOptimisticRating(null);
    },
  });

  if (!ticket) return null;

  const displayTicket = {
    ...ticket,
    ...(statusMutation.data || {}),
    ...(priorityMutation.data || {}),
    ...(commentMutation.data || {}),
    ...(rateSupportMutation.data || {}),
    comments:
      commentMutation.data?.comments
      || statusMutation.data?.comments
      || priorityMutation.data?.comments
      || rateSupportMutation.data?.comments
      || ticket.comments
      || [],
    statusHistory:
      statusMutation.data?.statusHistory
      || priorityMutation.data?.statusHistory
      || commentMutation.data?.statusHistory
      || rateSupportMutation.data?.statusHistory
      || ticket.statusHistory
      || [],
  };
  const availableUsers = knownUsers.length ? knownUsers : users;
  const creator = availableUsers.find((user) => user.id === displayTicket.createdBy);
  const creatorName = displayTicket.createdByName || creator?.name || "";
  const creatorTeam = teams.find(
    (team) => team.id === creator?.teamId || team.memberIds?.includes(displayTicket.createdBy),
  );
  const ticketComments = Array.isArray(displayTicket.comments) ? displayTicket.comments : [];
  const ticketStatusHistory = Array.isArray(displayTicket.statusHistory) ? displayTicket.statusHistory : [];
  const resolvedRating = optimisticRating ?? Number(displayTicket.supportRating || 0);
  const shouldShowSupportRating =
    currentUser.role === "support" || resolvedRating > 0;
  const canRateSupport =
    currentUser.role === "user"
    && displayTicket.createdBy === currentUser.id
    && displayTicket.status === "Cerrado";
  const currentRating = resolvedRating;
  const hasRatedSupport = currentRating > 0;

  const handleStatusChange = () => {
    if (!newStatus || !statusNote.trim()) return;

    statusMutation.mutate({
      ticketId: displayTicket.id,
      newStatus,
      changedBy: currentUser.id,
      note: statusNote,
    });
  };

  const handlePriorityChange = () => {
    if (!newPriority) return;

    priorityMutation.mutate({
      ticketId: displayTicket.id,
      updates: { priority: newPriority },
    });
  };

  const handleComment = () => {
    if (!comment.trim()) return;

    commentMutation.mutate({
      ticketId: displayTicket.id,
      comment: {
        authorId: currentUser.id,
        authorRole: currentUser.role,
        text: comment,
      },
    });
  };

  const handleRateSupport = (rating) => {
    if (!canRateSupport || rateSupportMutation.isPending) return;

    setOptimisticRating(rating);
    rateSupportMutation.mutate({
      ticketId: displayTicket.id,
      rating,
    });
  };

  const handleAttachmentDownload = async (attachment) => {
    if (!attachment) return;

    if (attachment.path) {
      const link = document.createElement("a");
      link.href = attachment.path;
      link.download = attachment.name || "adjunto";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }

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
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: T.panelMuted,
            border: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <BrandMark size={26} />
        </div>
        <Badge status={displayTicket.status} type="status" />
        <Badge status={displayTicket.priority} type="priority" />
        {isBlockingActivity(displayTicket.activity) && (
          <span
            style={{
              background: "#ef444415",
              color: "#ef4444",
              border: "1px solid #ef444430",
              borderRadius: 999,
              padding: "4px 12px",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            IMPIDE TRABAJAR
          </span>
        )}
        <span style={{ fontFamily: "monospace", fontSize: 12, color: T.textMuted, marginLeft: "auto" }}>
          {getTicketDisplayId(displayTicket)}
        </span>
      </div>

      <div
        style={{
          background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
          borderRadius: 14,
          overflow: "hidden",
          padding: 20,
          marginBottom: 20,
          border: `1px solid ${T.border}`,
          boxShadow: "0 12px 28px rgba(30,91,181,0.08)",
        }}
      >
        <h2 style={{ margin: "0 0 10px", color: T.textPrimary, fontSize: 22, lineHeight: 1.2, fontWeight: 800 }}>
          {displayTicket.title}
        </h2>
        <p style={{ margin: "0 0 14px", color: T.textSecondary, fontSize: 13, lineHeight: 1.7 }}>
          {displayTicket.description}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          {[
            ["Categoría", displayTicket.category],
            ["Actividad", isBlockingActivity(displayTicket.activity) ? "Impide trabajar" : "No impide trabajar"],
            ["Creado por", creatorName],
            ["Equipo", creatorTeam?.name || "Sin equipo"],
            ["Fecha", formatDate(displayTicket.createdAt)],
          ].map(([label, value]) => (
            <div key={label}>
              <p
                style={{
                  margin: "0 0 2px",
                  fontSize: 11,
                  color: T.textMuted,
                  fontFamily: "monospace",
                  textTransform: "uppercase",
                }}
              >
                {label}
              </p>
              <p style={{ margin: 0, fontSize: 13, color: T.textPrimary, fontWeight: 600 }}>{value}</p>
            </div>
          ))}
        </div>

        {displayTicket.attachments?.length > 0 && (
          <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {displayTicket.attachments.map((attachment, index) =>
              typeof attachment === "string" ? (
                <span
                  key={`${attachment}-${index}`}
                  style={{
                    background: T.accentSoft,
                    border: `1px solid ${T.borderStrong}`,
                    borderRadius: 999,
                    padding: "4px 10px",
                    fontSize: 11,
                    color: T.accent,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontWeight: 600,
                  }}
                >
                  <Paperclip size={10} />
                  {attachment}
                </span>
              ) : (
                <button
                  key={`${attachment.id}-${index}`}
                  type="button"
                  onClick={() => handleAttachmentDownload(attachment)}
                  style={{
                    background: T.accentSoft,
                    border: `1px solid ${T.borderStrong}`,
                    borderRadius: 999,
                    padding: "6px 10px",
                    fontSize: 11,
                    color: T.accent,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <Paperclip size={10} />
                  {attachment.name}
                  <span style={{ color: T.textSecondary }}>({(attachment.size / 1024 / 1024).toFixed(2)} MB)</span>
                  <Download size={11} />
                </button>
              ),
            )}
          </div>
        )}

        {displayTicket.status === "Cerrado" && shouldShowSupportRating && (
          <div
            style={{
              marginTop: 16,
              paddingTop: 14,
              borderTop: `1px solid ${T.border}`,
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: T.textMuted,
                fontFamily: "monospace",
                textTransform: "uppercase",
              }}
            >
              Calificación de soporte
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              {[1, 2, 3, 4, 5].map((value) => {
                const active = value <= currentRating;
                return (
                  <Star
                    key={value}
                    size={18}
                    color={active ? "#f59e0b" : "#d6e4f5"}
                    fill={active ? "#f59e0b" : "transparent"}
                    strokeWidth={1.9}
                  />
                );
              })}
            </span>
            <span style={{ fontSize: 12, color: T.textSecondary, fontWeight: 600 }}>
              {currentRating ? `${currentRating}/5` : "Pendiente"}
            </span>
          </div>
        )}
      </div>

      {canRateSupport && (
        <div
          style={{
            background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
            borderRadius: 14,
            padding: 18,
            marginBottom: 20,
            border: `1px solid ${T.border}`,
            boxShadow: "0 10px 24px rgba(30,91,181,0.07)",
          }}
        >
          <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace" }}>
            Calificación de soporte
          </p>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: T.textSecondary }}>
            {hasRatedSupport ? "Tu calificación ya fue registrada." : "Califica la atención de soporte después del cierre del ticket."}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {[1, 2, 3, 4, 5].map((value) => {
              const active = value <= (ratingHover || currentRating);
              return (
                <button
                  key={value}
                  type="button"
                  disabled={hasRatedSupport || rateSupportMutation.isPending}
                  onMouseEnter={() => !hasRatedSupport && setRatingHover(value)}
                  onMouseLeave={() => !hasRatedSupport && setRatingHover(0)}
                  onClick={() => handleRateSupport(value)}
                  style={{
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    cursor: hasRatedSupport ? "default" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  aria-label={`Calificar con ${value} estrellas`}
                >
                  <Star
                    size={24}
                    color={active ? "#f59e0b" : "#bfd3f2"}
                    fill={active ? "#f59e0b" : "transparent"}
                    strokeWidth={1.9}
                  />
                </button>
              );
            })}
            <span style={{ marginLeft: 6, fontSize: 12, color: T.textSecondary, fontWeight: 600 }}>
              {rateSupportMutation.isPending
                ? "Guardando..."
                : hasRatedSupport
                  ? `${currentRating}/5`
                  : "Selecciona una estrella"}
            </span>
          </div>
        </div>
      )}

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
                <Button variant="secondary" size="sm" style={editorSecondaryButtonStyle} onClick={() => setShowStatusEditor(false)}>
                  Cancelar
                </Button>
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
                <Button variant="secondary" size="sm" style={editorSecondaryButtonStyle} onClick={() => setShowPriorityEditor(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <p
          style={{
            margin: "0 0 12px",
            fontSize: 12,
            fontWeight: 700,
            color: T.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontFamily: "monospace",
          }}
        >
          Historial de Estado
        </p>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {[...ticketStatusHistory].reverse().map((history, index) => {
            const config = STATUS_CONFIG[history.status];
            const author = availableUsers.find((user) => user.id === history.changedBy);

            return (
              <div key={`${history.changedAt}-${index}`} style={{ display: "flex", gap: 12, paddingBottom: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: config?.bg || T.panelMuted,
                      border: `1.5px solid ${config?.color || T.borderStrong}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Circle size={8} fill={config?.color} color={config?.color} />
                  </div>
                  {index < ticketStatusHistory.length - 1 && (
                    <div style={{ width: 1, flex: 1, background: T.borderStrong, marginTop: 4 }} />
                  )}
                </div>

                <div style={{ paddingBottom: 4 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: config?.color }}>{history.status}</span>
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
        <p
          style={{
            margin: "0 0 12px",
            fontSize: 12,
            fontWeight: 700,
            color: T.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontFamily: "monospace",
          }}
        >
          Comentarios ({ticketComments.length})
        </p>

        {ticketComments.length === 0 && (
          <p style={{ color: T.textMuted, fontSize: 13, textAlign: "center", padding: "16px 0" }}>
            Sin comentarios aun
          </p>
        )}

        {ticketComments.map((ticketComment) => {
          const author = availableUsers.find((user) => user.id === ticketComment.authorId);
          const color =
            ticketComment.authorRole === "support"
              ? "#1e5bb5"
              : ticketComment.authorRole === "supervisor"
                ? "#7c3aed"
                : "#4a6fa5";

          return (
            <div
              key={ticketComment.id}
              style={{
                background: T.panel,
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                padding: 12,
                marginBottom: 8,
                boxShadow: "0 8px 18px rgba(30,91,181,0.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Avatar initials={author?.avatar || "??"} size={24} color={color} />
                <span style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>
                  {ticketComment.authorName || author?.name || "Desconocido"}
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
              style={{
                flex: 1,
                background: T.panel,
                border: `1px solid ${T.border}`,
                borderRadius: 10,
                padding: "10px 14px",
                color: T.textPrimary,
                fontSize: 13,
                fontFamily: "'DM Sans', sans-serif",
                outline: "none",
              }}
              onFocus={(event) => {
                event.target.style.borderColor = T.accent;
              }}
              onBlur={(event) => {
                event.target.style.borderColor = T.border;
              }}
            />
            <Button onClick={handleComment} disabled={commentMutation.isPending} style={{ padding: "10px 14px", minWidth: 110 }}>
              {commentMutation.isPending ? "Enviando..." : <Send size={15} />}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
