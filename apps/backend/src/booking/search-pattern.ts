// A "contains" LIKE pattern for `booking.search_text` (STAFF-004): the
// query's own `%`, `_`, and `\` match literally, never as wildcards.
export const containsPattern = (query: string): string =>
  `%${query.trim().replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
