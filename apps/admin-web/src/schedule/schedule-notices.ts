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

export const replacedNotice = (
  result: {
    created: number;
    skipped: number;
    cancelledSessions: number;
    keptSessions: number;
  },
  effectiveFrom: string,
): string =>
  `Serie actualizada desde el ${formatCivilDate(effectiveFrom)}: ${count(result.created, "sesión nueva", "sesiones nuevas")}; ${result.cancelledSessions} sin reservas ${result.cancelledSessions === 1 ? "se reemplazó" : "se reemplazaron"} y ${keptNote(result.keptSessions, " sin cambios")}.${skippedNote(result.skipped)}`;

export const endedNotice = (
  result: { cancelledSessions: number; keptSessions: number },
  effectiveFrom: string,
): string =>
  `La serie deja de repetirse desde el ${formatCivilDate(effectiveFrom)}: ${count(result.cancelledSessions, "sesión sin reservas se canceló", "sesiones sin reservas se cancelaron")} y ${keptNote(result.keptSessions, "")}.`;

export const cancelledNotice = (affectedBookings: number): string =>
  `Sesión cancelada: ${count(affectedBookings, "reserva reembolsada", "reservas reembolsadas")} y avisos enviados.`;
