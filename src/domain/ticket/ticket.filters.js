export const defaultFilters = {
  search:   "",
  status:   "Todos",
  priority: "Todas",
  activity: "Todas",
  category: "Todas",
  userId:   "",
};

/**
 * Pure filter function — works on any array of ticket objects.
 * Swap this for a server-side query string builder when you add a real API.
 *
 * @param {Array}  tickets
 * @param {Object} filters
 * @returns {Array}
 */
export function applyFilters(tickets, filters) {
  return tickets.filter((t) => {
    if (
      filters.search &&
      !t.title.toLowerCase().includes(filters.search.toLowerCase()) &&
      !t.id.toLowerCase().includes(filters.search.toLowerCase())
    )
      return false;

    if (filters.status   && filters.status   !== "Todos"  && t.status   !== filters.status)   return false;
    if (filters.priority && filters.priority !== "Todas"  && t.priority !== filters.priority) return false;
    if (filters.activity && filters.activity !== "Todas"  && t.activity !== filters.activity) return false;
    if (filters.category && filters.category !== "Todas"  && t.category !== filters.category) return false;
    if (filters.userId   && t.createdBy !== filters.userId) return false;

    return true;
  });
}
