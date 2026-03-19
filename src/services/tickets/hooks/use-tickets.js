import { useQuery }       from "@tanstack/react-query";
import { ticketsApi, usersApi, teamsApi } from "../api/tickets.api.js";
import { ticketKeys, userKeys, teamKeys } from "../api/tickets.keys.js";

/* ── Tickets ─────────────────────────────────────────────── */
export const useAllTickets = (options = {}) =>
  useQuery({ queryKey: ticketKeys.lists(), queryFn: ticketsApi.getAll, ...options });

export const useTicketsByUser = (userId, options = {}) =>
  useQuery({
    queryKey: ticketKeys.byUser(userId),
    queryFn:  () => ticketsApi.getByUser(userId),
    enabled:  !!userId,
    ...options,
  });

export const useTicketsByTeam = (teamId, options = {}) =>
  useQuery({
    queryKey: ticketKeys.byTeam(teamId),
    queryFn:  () => ticketsApi.getByTeam(teamId),
    enabled:  !!teamId,
    ...options,
  });

export const useTicketDetail = (id, options = {}) =>
  useQuery({
    queryKey: ticketKeys.detail(id),
    queryFn:  () => ticketsApi.getById(id),
    enabled:  !!id,
    ...options,
  });

/* ── Users ───────────────────────────────────────────────── */
export const useUsers = (options = {}) =>
  useQuery({ queryKey: userKeys.all(), queryFn: usersApi.getAll, ...options });

export const useUser = (id, options = {}) =>
  useQuery({
    queryKey: userKeys.detail(id),
    queryFn:  () => usersApi.getById(id),
    enabled:  !!id,
    ...options,
  });

/* ── Teams ───────────────────────────────────────────────── */
export const useTeams = (options = {}) =>
  useQuery({ queryKey: teamKeys.all(), queryFn: teamsApi.getAll, ...options });

export const useTeamBySupervisor = (supId, options = {}) =>
  useQuery({
    queryKey: teamKeys.bySupervisor(supId),
    queryFn:  () => teamsApi.getBySupervisor(supId),
    enabled:  !!supId,
    ...options,
  });
