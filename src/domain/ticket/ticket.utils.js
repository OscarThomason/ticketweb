/**
 * Format an ISO date string → "12 ene 2025"
 * @param {string} iso
 * @returns {string}
 */
export function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", {
    day:   "2-digit",
    month: "short",
    year:  "numeric",
  });
}

/**
 * Format an ISO date string → "12 ene 14:30"
 * @param {string} iso
 * @returns {string}
 */
export function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", {
    day:    "2-digit",
    month:  "short",
    hour:   "2-digit",
    minute: "2-digit",
  });
}

/**
 * Group an array of tickets by calendar month label.
 * Returns an object keyed by "month year" strings.
 * @param {Array} tickets
 * @returns {Object}
 */
export function groupByMonth(tickets) {
  return tickets.reduce((acc, t) => {
    const key = new Date(t.createdAt).toLocaleString("es-MX", {
      month: "long",
      year:  "numeric",
    });
    acc[key] = [...(acc[key] || []), t];
    return acc;
  }, {});
}
