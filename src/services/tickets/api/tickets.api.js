import { apiRequest, isBackendEnabled } from "../../api/http-client.js";
import { ticketsRepository } from "../hooks/tickets.repository.local.js";
import { usersRepository } from "../users/users.repository.local.js";
import { teamsRepository } from "../../teams/teams.repository.local.js";

const backendEnabled = () => isBackendEnabled();

export const ticketsApi = {
  getAll: () =>
    backendEnabled()
      ? apiRequest("/api/tickets")
      : Promise.resolve(ticketsRepository.getAll()),

  getById: (id) =>
    backendEnabled()
      ? apiRequest(`/api/tickets/${id}`)
      : Promise.resolve(ticketsRepository.getById(id)),

  getByUser: (userId) =>
    backendEnabled()
      ? apiRequest(`/api/tickets?userId=${encodeURIComponent(userId)}`)
      : Promise.resolve(ticketsRepository.getByUser(userId)),

  getByTeam: (teamId) =>
    backendEnabled()
      ? apiRequest(`/api/tickets?teamId=${encodeURIComponent(teamId)}`)
      : Promise.resolve(ticketsRepository.getByTeam(teamId)),

  create: (payload) =>
    backendEnabled()
      ? apiRequest("/api/tickets", { method: "POST", body: JSON.stringify(payload) })
      : Promise.resolve(ticketsRepository.create(payload)),

  update: (id, updates) =>
    backendEnabled()
      ? apiRequest(`/api/tickets/${id}`, { method: "PUT", body: JSON.stringify(updates) })
      : Promise.resolve(ticketsRepository.update(id, updates)),

  updateStatus: (id, status, by, note) =>
    backendEnabled()
      ? apiRequest(`/api/tickets/${id}/status`, {
          method: "POST",
          body: JSON.stringify({ status, note }),
        })
      : Promise.resolve(ticketsRepository.updateStatus(id, status, by, note)),

  addComment: (id, comment) =>
    backendEnabled()
      ? apiRequest(`/api/tickets/${id}/comments`, {
          method: "POST",
          body: JSON.stringify({ text: comment?.text || "" }),
        }).then(async () => (backendEnabled() ? apiRequest(`/api/tickets/${id}`) : null))
      : Promise.resolve(ticketsRepository.addComment(id, comment)),
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
