import { apiRequest, isBackendEnabled } from "../api/http-client.js";
import { notificationsRepository } from "./notifications.repository.local.js";

export const notificationsApi = {
  getAll: async () => {
    if (!isBackendEnabled()) {
      return notificationsRepository.getAll();
    }
    return apiRequest("/api/notifications");
  },
  markRead: async (id) => {
    if (!isBackendEnabled()) {
      return notificationsRepository.markRead(id);
    }
    return apiRequest(`/api/notifications/${id}/read`, {
      method: "POST",
    });
  },
  markAllRead: async () => {
    if (!isBackendEnabled()) {
      notificationsRepository.markAllRead();
      return null;
    }
    return apiRequest("/api/notifications/read-all", {
      method: "POST",
    });
  },
};
