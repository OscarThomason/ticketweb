const KEY = "ts_teams";

const _get = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
const _set = (v) => localStorage.setItem(KEY, JSON.stringify(v));

export const teamsRepository = {
  getAll:           ()        => _get(),
  getById:          (id)      => _get().find((t) => t.id === id) ?? null,
  getBySupervisor:  (supId)   => _get().find((t) => (t.supervisorIds || (t.supervisorId ? [t.supervisorId] : [])).includes(supId)) ?? null,
  getByMember:      (userId)  => _get().find((t) => t.memberIds.includes(userId)) ?? null,

  create(teamData) {
    const teams = _get();
    const normalizedSupervisorIds = Array.from(
      new Set(teamData.supervisorIds || (teamData.supervisorId ? [teamData.supervisorId] : [])),
    );
    const team = {
      ...teamData,
      id: teamData.id || crypto.randomUUID(),
      supervisorIds: normalizedSupervisorIds,
      memberIds: teamData.memberIds || [],
    };
    teams.push(team);
    _set(teams);
    return team;
  },

  update(id, updates) {
    const teams = _get();
    const idx = teams.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    teams[idx] = { ...teams[idx], ...updates };
    _set(teams);
    return teams[idx];
  },

  delete(id) {
    _set(_get().filter((t) => t.id !== id));
  },

  addMember(teamId, userId) {
    const teams = _get();
    const idx = teams.findIndex((t) => t.id === teamId);
    if (idx === -1) return null;
    if (!teams[idx].memberIds.includes(userId)) {
      teams[idx].memberIds.push(userId);
    }
    _set(teams);
    return teams[idx];
  },

  removeMember(teamId, userId) {
    const teams = _get();
    const idx = teams.findIndex((t) => t.id === teamId);
    if (idx === -1) return null;
    teams[idx].memberIds = teams[idx].memberIds.filter((id) => id !== userId);
    _set(teams);
    return teams[idx];
  },

  save:  (teams) => _set(teams),
  clear: ()      => localStorage.removeItem(KEY),
};
