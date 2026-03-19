function getEffectiveRole(user) {
  const rawRole = String(user?.role || "").toUpperCase();
  if (rawRole === "SUPPORT") return "support";
  if (rawRole === "SUPERVISOR" && user?.assignment?.isSupervisor) return "supervisor";
  return "user";
}

export function serializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: String(user.role || "").toLowerCase(),
    effectiveRole: getEffectiveRole(user),
    avatar: user.avatar || null,
    teamId: user.assignment?.teamId || null,
    team: user.assignment?.team
      ? {
          id: user.assignment.team.id,
          name: user.assignment.team.name,
          isSupervisor: Boolean(user.assignment.isSupervisor),
        }
      : null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function normalizeRole(role) {
  const value = String(role || "").trim().toLowerCase();
  if (value === "support") return "SUPPORT";
  if (value === "supervisor") return "SUPERVISOR";
  return "USER";
}
