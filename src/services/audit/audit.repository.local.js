const KEY = "ts_audit_logs";

const _get = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
};

const _set = (value) => localStorage.setItem(KEY, JSON.stringify(value));

export const auditRepository = {
  getAll() {
    return _get().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  add(entry) {
    const logs = _get();
    const nextEntry = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...entry,
    };
    logs.push(nextEntry);
    _set(logs);
    return nextEntry;
  },

  clear() {
    localStorage.removeItem(KEY);
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
  auditRepository.add({
    actorId: actorId || "system",
    actorName: actorName || "Sistema",
    action,
    entityType,
    entityId,
    summary,
    details,
  });
}
