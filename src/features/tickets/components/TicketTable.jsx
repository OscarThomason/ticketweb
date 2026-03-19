import { Paperclip, Eye } from "lucide-react";
import Badge from "../../../shared/components/Badge.jsx";
import BrandMark from "../../../shared/components/BrandMark.jsx";
import { formatDate, getTicketDisplayId } from "../../../shared/utils/tickets.js";
import { usersRepository } from "../../../services/tickets/users/users.repository.local.js";

export default function TicketTable({ tickets, onSelect, showUser = false }) {
  const users = usersRepository.getAll();

  if (tickets.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px 20px", color: "#64748b" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <BrandMark size={32} />
        </div>
        <p style={{ margin: 0, fontSize: 14 }}>No hay tickets para mostrar</p>
      </div>
    );
  }

  const thStyle = {
    padding: "10px 12px",
    textAlign: "left",
    fontSize: 11,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontFamily: "monospace",
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #2a3040" }}>
            <th style={thStyle}>ID</th>
            <th style={thStyle}>Título</th>
            {showUser && <th style={thStyle}>Usuario</th>}
            <th style={thStyle}>Categoría</th>
            <th style={thStyle}>Prioridad</th>
            <th style={thStyle}>Estado</th>
            <th style={thStyle}>Fecha</th>
            <th style={thStyle}></th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => {
            const creator = users.find((user) => user.id === ticket.createdBy);
            const creatorName = ticket.createdByName || creator?.name || "";

            return (
              <tr
                key={ticket.id}
                style={{ borderBottom: "1px solid #1a2030", cursor: "pointer", transition: "background 0.15s" }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background = "#1a2030";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = "transparent";
                }}
                onClick={() => onSelect(ticket.id)}
              >
                <td style={{ padding: "12px", fontFamily: "monospace", fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>
                  {getTicketDisplayId(ticket)}
                </td>
                <td style={{ padding: "12px", color: "#e2e8f0", maxWidth: 220 }}>
                  <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ticket.title}
                  </span>
                  {ticket.attachments?.length > 0 && (
                    <span style={{ fontSize: 10, color: "#64748b" }}>
                      <Paperclip size={9} style={{ display: "inline" }} /> {ticket.attachments.length}
                    </span>
                  )}
                </td>
                {showUser && <td style={{ padding: "12px", color: "#94a3b8" }}>{creatorName}</td>}
                <td style={{ padding: "12px", color: "#94a3b8" }}>{ticket.category}</td>
                <td style={{ padding: "12px" }}>
                  <Badge status={ticket.priority} type="priority" />
                </td>
                <td style={{ padding: "12px" }}>
                  <Badge status={ticket.status} type="status" />
                </td>
                <td style={{ padding: "12px", color: "#64748b", fontFamily: "monospace", fontSize: 11, whiteSpace: "nowrap" }}>
                  {formatDate(ticket.createdAt)}
                </td>
                <td style={{ padding: "12px" }}>
                  <Eye size={14} color="#64748b" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
