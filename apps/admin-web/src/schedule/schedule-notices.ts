import { formatCivilDate } from "../lib/bolivia-time";
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

const count = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

const skippedNote = (skipped: number): string =>
  skipped === 0
    ? ""
    : skipped === 1
      ? " 1 se omitió porque se cruzaba con otra sesión."
      : ` ${skipped} se omitieron porque se cruzaban con otras sesiones.`;

const keptNote = (kept: number, suffix: string): string =>
  kept === 1
    ? `1 con reservas se mantiene${suffix}`
    : `${kept} con reservas se mantienen${suffix}`;

// Only the groups of Sessions that exist are named.
const clauses = (parts: (string | false)[]): string =>
  parts.filter((part): part is string => part !== false).join(" y ");

export const replacedNotice = (
  result: {
    created: number;
    skipped: number;
    cancelledSessions: number;
    keptSessions: number;
  },
  effectiveFrom: string,
): string => {
  const changed = clauses([
    result.cancelledSessions > 0 &&
      `${result.cancelledSessions} sin reservas ${result.cancelledSessions === 1 ? "se reemplazó" : "se reemplazaron"}`,
    result.keptSessions > 0 && keptNote(result.keptSessions, " sin cambios"),
  ]);
  const created = count(result.created, "sesión nueva", "sesiones nuevas");
  return `Serie actualizada desde el ${formatCivilDate(effectiveFrom)}: ${created}${changed === "" ? "" : `; ${changed}`}.${skippedNote(result.skipped)}`;
};

export const endedNotice = (
  result: { cancelledSessions: number; keptSessions: number },
  effectiveFrom: string,
): string => {
  const date = formatCivilDate(effectiveFrom);
  const changed = clauses([
    result.cancelledSessions > 0 &&
      count(
        result.cancelledSessions,
        "sesión sin reservas se canceló",
        "sesiones sin reservas se cancelaron",
      ),
    result.keptSessions > 0 && keptNote(result.keptSessions, ""),
  ]);
  return changed === ""
    ? `La serie deja de repetirse desde el ${date}. No había sesiones futuras que cambiar.`
    : `La serie deja de repetirse desde el ${date}: ${changed}.`;
};

export const cancelledNotice = (affectedBookings: number): string =>
  `Sesión cancelada: ${count(affectedBookings, "reserva reembolsada", "reservas reembolsadas")} y avisos enviados.`;
