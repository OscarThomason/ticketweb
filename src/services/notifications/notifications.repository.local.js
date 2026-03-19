const KEY = "ts_notifications";

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

function writeAll(value) {
  localStorage.setItem(KEY, JSON.stringify(value));
}

export const notificationsRepository = {
  getAll() {
    const items = readAll().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return {
      items,
      unreadCount: items.filter((item) => !item.readAt).length,
    };
  },
  markRead(id) {
    const items = readAll().map((item) =>
      item.id === id && !item.readAt ? { ...item, readAt: new Date().toISOString() } : item
    );
    writeAll(items);
    return items.find((item) => item.id === id) || null;
  },
  markAllRead() {
    const now = new Date().toISOString();
    const items = readAll().map((item) => (item.readAt ? item : { ...item, readAt: now }));
    writeAll(items);
  },
};
