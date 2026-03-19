const KEY = "ts_tickets";

const _get = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
const _set = (v) => localStorage.setItem(KEY, JSON.stringify(v));

export const ticketsRepository = {
  /** Read */
  getAll:      ()       => _get(),
  getById:     (id)     => _get().find((t) => t.id === id) ?? null,
  getByUser:   (userId) => _get().filter((t) => t.createdBy === userId),
  getByTeam:   (teamId) => _get().filter((t) => t.teamId   === teamId),

  /** Write — create */
  create(payload) {
    const tickets = _get();
    const now = new Date().toISOString();
    const ticket = {
      ...payload,
      id:          `tk-${String(tickets.length + 1).padStart(4, "0")}`,
      status:      "Abierto",
      comments:    [],
      attachments: payload.attachments ?? [],
      statusHistory: [
        { status: "Abierto", changedBy: payload.createdBy, changedAt: now, note: "Ticket creado" },
      ],
      createdAt: now,
      updatedAt: now,
    };
    tickets.push(ticket);
    _set(tickets);
    return ticket;
  },

  /** Write — update status */
  updateStatus(ticketId, newStatus, changedBy, note = "") {
    const tickets = _get();
    const idx = tickets.findIndex((t) => t.id === ticketId);
    if (idx === -1) return null;
    const now = new Date().toISOString();
    tickets[idx].status    = newStatus;
    tickets[idx].updatedAt = now;
    tickets[idx].statusHistory.push({ status: newStatus, changedBy, changedAt: now, note });
    _set(tickets);
    return tickets[idx];
  },

  /** Write — add comment */
  addComment(ticketId, comment) {
    const tickets = _get();
    const idx = tickets.findIndex((t) => t.id === ticketId);
    if (idx === -1) return null;
    const now = new Date().toISOString();
    const newComment = { id: crypto.randomUUID(), ...comment, createdAt: now };
    tickets[idx].comments.push(newComment);
    tickets[idx].updatedAt = now;
    _set(tickets);
    return tickets[idx];
  },

  /** Write — generic update */
  update(ticketId, updates) {
    const tickets = _get();
    const idx = tickets.findIndex((t) => t.id === ticketId);
    if (idx === -1) return null;
    const now = new Date().toISOString();
    tickets[idx] = { ...tickets[idx], ...updates, updatedAt: now };
    _set(tickets);
    return tickets[idx];
  },

  /** Maintenance */
  save:  (tickets) => _set(tickets),
  clear: ()        => localStorage.removeItem(KEY),
};
