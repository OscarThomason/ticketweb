import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "./notifications.api.js";
import { notificationKeys } from "./notifications.keys.js";

export function useNotifications(options = {}) {
  return useQuery({
    queryKey: notificationKeys.all(),
    queryFn: notificationsApi.getAll,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    ...options,
  });
}

export function useMarkNotificationRead(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all() });
    },
    ...options,
  });
}

export function useMarkAllNotificationsRead(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all() });
    },
    ...options,
  });
}
