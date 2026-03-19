import { apiRequest, isBackendEnabled } from "../../api/http-client.js";
import { ticketsRepository } from "../hooks/tickets.repository.local.js";
import { usersRepository } from "../users/users.repository.local.js";
import { teamsRepository } from "../../teams/teams.repository.local.js";

const backendEnabled = () => isBackendEnabled();

function normalizeTicket(ticket) {
  if (!ticket) return ticket;

  return {
    ...ticket,
    createdBy: ticket.createdById || ticket.createdBy?.id || ticket.createdBy || null,
    createdByName: ticket.createdByName || ticket.createdBy?.name || null,
    closedBySupportId: ticket.closedBySupportId || null,
    supportRating: ticket.supportRating ?? null,
    supportRatedAt: ticket.supportRatedAt || null,
    attachments: normalizeAttachments(ticket.attachments),
    comments: Array.isArray(ticket.comments)
      ? ticket.comments.map((comment) => ({
          ...comment,
          authorId: comment.authorId || comment.author?.id || null,
          authorName: comment.authorName || comment.author?.name || null,
        }))
      : [],
    statusHistory: Array.isArray(ticket.statusHistory)
      ? ticket.statusHistory.map((entry) => ({
          ...entry,
          changedBy: entry.changedById || entry.changedBy?.id || entry.changedBy || null,
        }))
      : [],
  };
}

function toAbsoluteUploadPath(pathValue) {
  const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  if (!base || !pathValue) return null;
  if (String(pathValue).startsWith("http")) return pathValue;
  return `${base}/uploads/${String(pathValue).replace(/^\/+/, "")}`;
}

function normalizeAttachments(attachments) {
  if (!Array.isArray(attachments)) return [];

  return attachments.map((attachment, index) => {
    if (!attachment || typeof attachment === "string") return attachment;

    return {
      id: attachment.id || `server-attachment-${index}`,
      name: attachment.name || attachment.fileName || "captura",
      size: attachment.size || attachment.sizeBytes || 0,
      type: attachment.type || attachment.mimeType || "application/octet-stream",
      uploadedAt: attachment.uploadedAt || null,
      path: toAbsoluteUploadPath(attachment.path),
    };
  });
}

async function toBase64(file) {
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < bytes.byteLength; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

async function serializeAttachmentsForBackend(attachments) {
  if (!Array.isArray(attachments) || attachments.length === 0) return [];

  const serialized = [];
  for (const attachment of attachments.slice(0, 1)) {
    if (attachment?.file instanceof File) {
      serialized.push({
        fileName: attachment.name || attachment.file.name,
        mimeType: attachment.type || attachment.file.type || "image/jpeg",
        sizeBytes: attachment.size || attachment.file.size || 0,
        base64: await toBase64(attachment.file),
      });
      continue;
    }

    serialized.push(attachment);
  }

  return serialized;
}

export const ticketsApi = {
  getAll: () =>
    backendEnabled()
      ? apiRequest("/api/tickets").then((tickets) => tickets.map(normalizeTicket))
      : Promise.resolve(ticketsRepository.getAll()),

  getById: (id) =>
    backendEnabled()
      ? apiRequest(`/api/tickets/${id}`).then(normalizeTicket)
      : Promise.resolve(ticketsRepository.getById(id)),

  getByUser: (userId) =>
    backendEnabled()
      ? apiRequest(`/api/tickets?userId=${encodeURIComponent(userId)}`).then((tickets) => tickets.map(normalizeTicket))
      : Promise.resolve(ticketsRepository.getByUser(userId)),

  getByTeam: (teamId) =>
    backendEnabled()
      ? apiRequest(`/api/tickets?teamId=${encodeURIComponent(teamId)}`).then((tickets) => tickets.map(normalizeTicket))
      : Promise.resolve(ticketsRepository.getByTeam(teamId)),

  create: async (payload) => {
    if (!backendEnabled()) {
      return ticketsRepository.create(payload);
    }

    const backendPayload = {
      ...payload,
      attachments: await serializeAttachmentsForBackend(payload.attachments),
    };

    const created = await apiRequest("/api/tickets", { method: "POST", body: JSON.stringify(backendPayload) });
    return normalizeTicket(created);
  },

  update: (id, updates) =>
    backendEnabled()
      ? apiRequest(`/api/tickets/${id}`, { method: "PUT", body: JSON.stringify(updates) }).then(normalizeTicket)
      : Promise.resolve(ticketsRepository.update(id, updates)),

  updateStatus: (id, status, by, note) =>
    backendEnabled()
      ? apiRequest(`/api/tickets/${id}/status`, {
          method: "POST",
          body: JSON.stringify({ status, note }),
        }).then(normalizeTicket)
      : Promise.resolve(ticketsRepository.updateStatus(id, status, by, note)),

  addComment: (id, comment) =>
    backendEnabled()
      ? apiRequest(`/api/tickets/${id}/comments`, {
          method: "POST",
          body: JSON.stringify({ text: comment?.text || "" }),
        }).then(async () => (backendEnabled() ? apiRequest(`/api/tickets/${id}`).then(normalizeTicket) : null))
      : Promise.resolve(ticketsRepository.addComment(id, comment)),

  rateSupport: (id, rating) =>
    backendEnabled()
      ? apiRequest(`/api/tickets/${id}/rating`, {
          method: "POST",
          body: JSON.stringify({ rating }),
        }).then(normalizeTicket)
      : Promise.resolve(ticketsRepository.rateSupport(id, rating)),
};

export const usersApi = {
  getAll: () =>
    backendEnabled()
      ? apiRequest("/api/users")
      : Promise.resolve(usersRepository.getAll()),

  getById: async (id) => {
    if (!backendEnabled()) return usersRepository.getById(id);
    const users = await apiRequest("/api/users");
    return users.find((u) => u.id === id) || null;
  },

  getByEmail: async (email) => {
    if (!backendEnabled()) return usersRepository.getByEmail(email);
    const users = await apiRequest("/api/users");
    return users.find((u) => u.email === email) || null;
  },

  create: (data) =>
    backendEnabled()
      ? apiRequest("/api/users", { method: "POST", body: JSON.stringify(data) })
      : Promise.resolve(usersRepository.create(data)),

  update: (id, data) =>
    backendEnabled()
      ? apiRequest(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(data) })
      : Promise.resolve(usersRepository.update(id, data)),

  delete: (id) =>
    backendEnabled()
      ? apiRequest(`/api/users/${id}`, { method: "DELETE" })
      : Promise.resolve(usersRepository.delete(id)),
};

export const teamsApi = {
  getAll: () =>
    backendEnabled()
      ? apiRequest("/api/teams")
      : Promise.resolve(teamsRepository.getAll()),

  getBySupervisor: async (supId) => {
    if (!backendEnabled()) return teamsRepository.getBySupervisor(supId);
    const teams = await apiRequest("/api/teams");
    return teams.find((team) => (team.supervisorIds || []).includes(supId)) || null;
  },

  getByMember: async (uid) => {
    if (!backendEnabled()) return teamsRepository.getByMember(uid);
    const teams = await apiRequest("/api/teams");
    return teams.find((team) => (team.memberIds || []).includes(uid)) || null;
  },

  create: (data) =>
    backendEnabled()
      ? apiRequest("/api/teams", { method: "POST", body: JSON.stringify(data) })
      : Promise.resolve(teamsRepository.create(data)),

  update: (id, data) =>
    backendEnabled()
      ? apiRequest(`/api/teams/${id}`, { method: "PUT", body: JSON.stringify(data) })
      : Promise.resolve(teamsRepository.update(id, data)),

  delete: (id) =>
    backendEnabled()
      ? apiRequest(`/api/teams/${id}`, { method: "DELETE" })
      : Promise.resolve(teamsRepository.delete(id)),

  addMember: async (teamId, uid) => {
    if (!backendEnabled()) return teamsRepository.addMember(teamId, uid);
    const team = await teamsApi.getAll().then((teams) => teams.find((item) => item.id === teamId));
    if (!team) return null;
    const memberIds = Array.from(new Set([...(team.memberIds || []), uid]));
    return teamsApi.update(teamId, {
      name: team.name,
      supervisorIds: team.supervisorIds || [],
      memberIds,
    });
  },

  removeMember: async (teamId, uid) => {
    if (!backendEnabled()) return teamsRepository.removeMember(teamId, uid);
    const team = await teamsApi.getAll().then((teams) => teams.find((item) => item.id === teamId));
    if (!team) return null;
    const memberIds = (team.memberIds || []).filter((id) => id !== uid);
    const supervisorIds = (team.supervisorIds || []).filter((id) => id !== uid);
    return teamsApi.update(teamId, {
      name: team.name,
      supervisorIds,
      memberIds,
    });
  },
};
