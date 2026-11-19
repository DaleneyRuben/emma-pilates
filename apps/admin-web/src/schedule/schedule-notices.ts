import { formatListDate } from "@pilates/api-contracts";
import { formatLongDay } from "../lib/bolivia-time";
import type { ScheduleChangeResult } from "./use-schedule-change";

// What the page says after a change, so the Administrator sees how many
// Sessions a weekly schedule touched (ADR-0059 keeps booked ones).
const count = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

const skippedNote = (skipped: number): string =>
  skipped === 0
    ? ""
    : skipped === 1
      ? " 1 se omitió porque se cruzaba con otra clase."
      : ` ${skipped} se omitieron porque se cruzaban con otras clases.`;

const keptNote = (kept: number, suffix: string): string =>
  kept === 1
    ? `1 con reservas se mantiene${suffix}`
    : `${kept} con reservas se mantienen${suffix}`;

// Only the groups of Sessions that exist are named.
const clauses = (parts: (string | false)[]): string =>
  parts.filter((part): part is string => part !== false).join(" y ");

// One row keeps the single schedule's wording; several rows are counted
// together (WEB-025).
export const createdNotice = (outcome: ScheduleChangeResult): string => {
  if (outcome.kind !== "create-schedules") return "Clase creada.";
  const { schedules } = outcome.result;
  const created = schedules.reduce((sum, row) => sum + row.created, 0);
  const skipped = schedules.reduce((sum, row) => sum + row.skipped, 0);
  const made =
    schedules.length === 1
      ? "Serie semanal creada"
      : `${schedules.length} series semanales creadas`;
  return `${made}: ${count(created, "clase", "clases")} en los próximos 30 días.${skippedNote(skipped)}`;
};

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
  const created = count(result.created, "clase nueva", "clases nuevas");
  return `Serie actualizada desde el ${formatListDate(effectiveFrom)}: ${created}${changed === "" ? "" : `; ${changed}`}.${skippedNote(result.skipped)}`;
};

export const endedNotice = (
  result: { cancelledSessions: number; keptSessions: number },
  effectiveFrom: string,
): string => {
  const date = formatListDate(effectiveFrom);
  const changed = clauses([
    result.cancelledSessions > 0 &&
      count(
        result.cancelledSessions,
        "clase sin reservas se canceló",
        "clases sin reservas se cancelaron",
      ),
    result.keptSessions > 0 && keptNote(result.keptSessions, ""),
  ]);
  return changed === ""
    ? `La serie deja de repetirse desde el ${date}. No había clases futuras que cambiar.`
    : `La serie deja de repetirse desde el ${date}: ${changed}.`;
};

export const cancelledNotice = (affectedBookings: number): string =>
  affectedBookings === 0
    ? "Clase cancelada."
    : `Clase cancelada: ${count(affectedBookings, "reserva reembolsada", "reservas reembolsadas")} y avisos enviados.`;

// BKM-018 (follow-up 234): the toasts after pausing and resuming a series.
export const pausedNotice = (pausedUntil: string | null): string =>
  pausedUntil === null
    ? "Serie en pausa hasta que la reanudes"
    : `Serie en pausa · vuelve el ${formatLongDay(pausedUntil)}`;

export const resumedNotice = "Serie reanudada · sus clases vuelven a la app";
