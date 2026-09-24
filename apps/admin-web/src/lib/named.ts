type Named = { id: string; name: string };
type Archivable = { name: string; archivedAt: string | null };

/** Each record's name by its id: Branches on a Personal row, a Supply's filter. */
export const namesById = (
  items: readonly Named[],
): ReadonlyMap<string, string> =>
  new Map(items.map((item) => [item.id, item.name]));

/** Active records by name, then the archived ones (Reporte's Branches, AW31's Supplies). */
export const archivedLast = (a: Archivable, b: Archivable): number =>
  Number(a.archivedAt !== null) - Number(b.archivedAt !== null) ||
  a.name.localeCompare(b.name, "es");
