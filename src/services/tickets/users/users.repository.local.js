const KEY = "ts_users";

const _get = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
const _set = (v) => localStorage.setItem(KEY, JSON.stringify(v));

export const usersRepository = {
  getAll:      ()     => _get(),
  getById:     (id)   => _get().find((u) => u.id === id) ?? null,
  getByRole:   (role) => _get().filter((u) => u.role === role),
  getByEmail:  (email) => _get().find((u) => u.email === email) ?? null,

  create(userData) {
    const users = _get();
    const user = { ...userData, id: userData.id || crypto.randomUUID() };
    users.push(user);
    _set(users);
    return user;
  },

  update(id, updates) {
    const users = _get();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    users[idx] = { ...users[idx], ...updates };
    _set(users);
    return users[idx];
  },

  delete(id) {
    _set(_get().filter((u) => u.id !== id));
  },

  save:  (users) => _set(users),
  clear: ()      => localStorage.removeItem(KEY),
};