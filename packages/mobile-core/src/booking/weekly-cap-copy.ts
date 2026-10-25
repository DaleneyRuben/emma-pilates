// BKM-007: the Reservar card and the Session detail build this line from the
// API field. A missing field, or null, means the Plan has no cap.
export function weeklyClassesLeftLine(
  classesLeftThisWeek: number | null | undefined,
): string | null {
  if (classesLeftThisWeek === null || classesLeftThisWeek === undefined) return null;
  if (classesLeftThisWeek === 1) return "Te queda 1 clase esta semana";
  return `Te quedan ${classesLeftThisWeek} clases esta semana`;
}
