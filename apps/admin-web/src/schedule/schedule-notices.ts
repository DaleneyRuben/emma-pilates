import type { ScheduleChangeResult } from "./use-schedule-change";

// What the page says after a change, so the Administrator sees how many
// Sessions a weekly schedule touched (ADR-0059 keeps booked ones).
export const createdNotice = (outcome: ScheduleChangeResult): string => {
  if (outcome.kind !== "create-schedule") return "Sesión creada.";
  const { created, skipped } = outcome.result;
  const made = `Serie semanal creada: ${created} ${created === 1 ? "sesión" : "sesiones"} en los próximos 30 días.`;
  if (skipped === 0) return made;
  return skipped === 1
    ? `${made} 1 se omitió porque se cruzaba con otra sesión.`
    : `${made} ${skipped} se omitieron porque se cruzaban con otras sesiones.`;
};
