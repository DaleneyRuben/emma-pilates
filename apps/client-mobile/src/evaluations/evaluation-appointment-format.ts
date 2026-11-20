import type { ClientEvaluationDto } from "@pilates/api-contracts";
import { formatDateTime, formatListDate } from "@pilates/api-contracts";
import { boliviaCivilDate, formatBolivianos } from "@pilates/mobile-core";

import { paidEvaluationLabel } from "./evaluation-format";

const dayMs = 24 * 60 * 60 * 1_000;
const civilDay = (civilDate: string) => Date.parse(`${civilDate}T12:00:00.000Z`);

// C5 pick C: «Tu cita · en 4 días», «hoy» and «mañana» when they apply.
export function appointmentLead(startsAt: string, today: string): string {
  const days = Math.round(
    (civilDay(boliviaCivilDate(new Date(startsAt))) - civilDay(today)) / dayMs,
  );
  if (days <= 0) return "Tu cita · hoy";
  if (days === 1) return "Tu cita · mañana";
  return `Tu cita · en ${days} días`;
}

// «Lun 23 nov · 09:45»: FIX-090's date with its time, opening the block.
export function appointmentWhen(startsAt: string): string {
  const text = formatDateTime(startsAt);
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

// «mié 25» in the current month, «mié 2 dic» after it.
export function slotDayLabel(startsAt: string, today: string): string {
  const text = formatListDate(startsAt);
  const sameMonth = boliviaCivilDate(new Date(startsAt)).slice(0, 7) === today.slice(0, 7);
  return sameMonth ? text.replace(/ \S+$/, "") : text;
}

// The block's payment words: the quarter's free one, or the price the server
// charged with its state. An unpaid one (0 centavos) says only its state.
export function appointmentPayment(
  evaluation: Pick<ClientEvaluationDto, "included" | "paymentState" | "priceCentavos">,
): string {
  if (evaluation.included) return "Gratis · primera del trimestre";
  const state = paidEvaluationLabel(evaluation.paymentState);
  return evaluation.priceCentavos > 0
    ? `${formatBolivianos(evaluation.priceCentavos)} · ${state}`
    : state;
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}
