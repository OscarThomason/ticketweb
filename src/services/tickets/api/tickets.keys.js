/**
 * Centralised query-key factory.
 * When you add a real API, the key shape stays the same —
 * only the fetcher functions in tickets.api.js change.
 */
export const ticketKeys = {
  all:        ()         => ["tickets"],
  lists:      ()         => ["tickets", "list"],
  list:       (filters)  => ["tickets", "list", filters],
  byUser:     (userId)   => ["tickets", "user",  userId],
  byTeam:     (teamId)   => ["tickets", "team",  teamId],
  detail:     (id)       => ["tickets", "detail", id],
};

export const userKeys = {
  all:        ()         => ["users"],
  detail:     (id)       => ["users", "detail", id],
};

export const teamKeys = {
  all:        ()         => ["teams"],
  bySupervisor: (id)     => ["teams", "supervisor", id],
};
