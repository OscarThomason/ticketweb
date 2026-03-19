import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketKeys } from "../api/tickets.keys.js";
import { ticketsApi, teamsApi } from "../api/tickets.api.js";

export const useCreateTicket = (options = {}) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ formData, currentUser }) => {
      const team = await teamsApi.getByMember(currentUser.id);

      return ticketsApi.create({
        ...formData,
        createdBy: currentUser.id,
        teamId: team?.id ?? null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ticketKeys.lists() });
    },
    ...options,
  });
};

export const useUpdateTicketStatus = (options = {}) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketId, newStatus, changedBy, note }) =>
      ticketsApi.updateStatus(ticketId, newStatus, changedBy, note),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ticketKeys.lists() });

      if (updated?.id) {
        qc.invalidateQueries({ queryKey: ticketKeys.detail(updated.id) });
      }
    },
    ...options,
  });
};

export const useUpdateTicket = (options = {}) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketId, updates }) => ticketsApi.update(ticketId, updates),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ticketKeys.lists() });

      if (updated?.id) {
        qc.invalidateQueries({ queryKey: ticketKeys.detail(updated.id) });
      }
    },
    ...options,
  });
};

export const useAddComment = (options = {}) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketId, comment }) =>
      ticketsApi.addComment(ticketId, comment),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ticketKeys.lists() });

      if (updated?.id) {
        qc.invalidateQueries({ queryKey: ticketKeys.detail(updated.id) });
      }
    },
    ...options,
  });
};
