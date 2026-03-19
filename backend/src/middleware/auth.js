import { prisma } from "../lib/prisma.js";
import { verifyToken } from "../lib/jwt.js";

function toPublicRole(role) {
  return String(role || "").toLowerCase();
}

function toEffectiveRole(user) {
  const role = String(user?.role || "").toUpperCase();
  if (role === "SUPPORT") return "support";
  if (role === "SUPERVISOR" && user?.assignment?.isSupervisor) return "supervisor";
  return "user";
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ message: "Missing token" });

  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        assignment: { include: { team: true } },
      },
    });

    if (!user) return res.status(401).json({ message: "Invalid token" });

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: toEffectiveRole(user),
      profileRole: toPublicRole(user.role),
      teamId: user.assignment?.teamId || null,
    };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireRole(...roles) {
  const expected = roles.map((role) => role.toLowerCase());
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!expected.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    return next();
  };
}
