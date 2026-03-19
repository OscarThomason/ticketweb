import { apiRequest, isBackendEnabled } from "../api/http-client.js";
import { auditRepository } from "./audit.repository.local.js";

export const auditApi = {
  getAll: async () => {
    if (!isBackendEnabled()) {
      return auditRepository.getAll();
    }
    return apiRequest("/api/audit");
  },
};

export function logAuditEntry({
  actorId,
  actorName,
  action,
  entityType,
  entityId,
  summary,
  details = "",
}) {
  if (!isBackendEnabled()) {
    auditRepository.add({
      actorId: actorId || "system",
      actorName: actorName || "Sistema",
      action,
      entityType,
      entityId,
      summary,
      details,
    });
    return;
  }

  apiRequest("/api/audit", {
    method: "POST",
    body: JSON.stringify({
      actorId,
      actorName,
      action,
      entityType,
      entityId,
      summary,
      details,
    }),
  }).catch(() => {
    // Keep UI non-blocking if audit endpoint fails.
  });
}

