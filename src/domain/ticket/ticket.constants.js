import {
  Circle,
  Clock,
  CheckCircle2,
  Pause,
} from "lucide-react";

export const STATUS_CONFIG = {
  Abierto:   { color: "#ef4444", bg: "rgba(239,68,68,0.12)",    label: "Abierto",    icon: Circle       },
  "En Proceso": { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", label: "En Proceso", icon: Clock        },
  Cerrado:   { color: "#10b981", bg: "rgba(16,185,129,0.12)",   label: "Cerrado",    icon: CheckCircle2 },
  Aplazado:  { color: "#6366f1", bg: "rgba(99,102,241,0.12)",   label: "Aplazado",   icon: Pause        },
};

export const PRIORITY_CONFIG = {
  Baja:    { color: "#64748b", bg: "rgba(100,116,139,0.12)" },
  Media:   { color: "#3b82f6", bg: "rgba(59,130,246,0.12)"  },
  Alta:    { color: "#f97316", bg: "rgba(249,115,22,0.12)"  },
  Crítica: { color: "#ef4444", bg: "rgba(239,68,68,0.18)",  pulse: true },
};

export const CATEGORIES = [
  "Software (error en sistema, app, login)",
  "Hardware (equipo físico, impresora, laptop)",
  "Red (internet, VPN)",
  "Accesos (usuarios, permisos)"
];
export const PRIORITIES  = ["Baja", "Media", "Alta", "Crítica"];
export const ACTIVITY_OPTIONS = ["Sí", "No"];
export const STATUSES    = ["Abierto", "En Proceso", "Cerrado", "Aplazado"];

export const ROLE_LABELS = {
  user:       "Usuario",
  supervisor: "Supervisor",
  support:    "Soporte",
};

export const ROLE_COLORS = {
  user:       "#94a3b8",
  supervisor: "#a78bfa",
  support:    "#00d4ff",
};
