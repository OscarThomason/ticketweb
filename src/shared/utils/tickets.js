/**
 * shared/utils/tickets.js
 * Convenience re-export so feature files can import from one path.
 */
export { formatDate, formatDateTime, groupByMonth } from "../../domain/ticket/ticket.utils.js";
export { applyFilters, defaultFilters }             from "../../domain/ticket/ticket.filters.js";
export {
  STATUS_CONFIG,
  PRIORITY_CONFIG,
  CATEGORIES,
  PRIORITIES,
  ACTIVITY_OPTIONS,
  STATUSES,
  ROLE_LABELS,
  ROLE_COLORS,
} from "../../domain/ticket/ticket.constants.js";

export function getTicketDisplayId(ticket) {
  if (!ticket) return "";
  if (ticket.code) return String(ticket.code).toUpperCase();

  const compact = String(ticket.id || "")
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase();

  if (!compact) return "TK-00000";
  return `TK-${compact.slice(-5).padStart(5, "0")}`;
}
