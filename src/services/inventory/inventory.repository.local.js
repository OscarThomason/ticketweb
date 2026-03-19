const KEY = "ts_inventory";

const _get = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
};

const _set = (value) => localStorage.setItem(KEY, JSON.stringify(value));

export const inventoryRepository = {
  getAll: () => _get(),
  getById: (id) => _get().find((item) => item.id === id) ?? null,
  getByAssignedUser: (userId) => _get().find((item) => item.assignedUserId === userId) ?? null,

  create(data) {
    const inventory = _get();
    const now = new Date().toISOString();
    const item = {
      id: data.id || crypto.randomUUID(),
      comments: data.comments || [],
      revisions: data.revisions ?? 0,
      createdAt: data.createdAt || now,
      updatedAt: now,
      ...data,
    };
    inventory.push(item);
    _set(inventory);
    return item;
  },

  update(id, updates, options = {}) {
    const inventory = _get();
    const index = inventory.findIndex((item) => item.id === id);
    if (index === -1) return null;

    const revisionDelta = options.incrementRevision ? 1 : 0;
    inventory[index] = {
      ...inventory[index],
      ...updates,
      revisions: (inventory[index].revisions || 0) + revisionDelta,
      updatedAt: new Date().toISOString(),
    };
    _set(inventory);
    return inventory[index];
  },

  upsertByAssignedUser(userId, data, options = {}) {
    const existing = this.getByAssignedUser(userId);

    if (existing) {
      return this.update(existing.id, { ...data, assignedUserId: userId }, options);
    }

    return this.create({
      ...data,
      assignedUserId: userId,
      revisions: options.initialRevision ?? 1,
    });
  },

  addComment(id, comment) {
    const inventory = _get();
    const index = inventory.findIndex((item) => item.id === id);
    if (index === -1) return null;

    const nextComment = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...comment,
    };

    inventory[index].comments = [...(inventory[index].comments || []), nextComment];
    inventory[index].updatedAt = new Date().toISOString();
    _set(inventory);
    return inventory[index];
  },

  delete(id) {
    _set(_get().filter((item) => item.id !== id));
  },

  save(items) {
    _set(items);
  },

  clear() {
    localStorage.removeItem(KEY);
  },
};
