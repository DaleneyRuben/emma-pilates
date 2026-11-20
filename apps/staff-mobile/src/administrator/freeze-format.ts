import { formatListDate, type FreezeReviewDto } from "@pilates/api-contracts";
import { formatStartTime } from "@pilates/mobile-core";

const atNoon = (civilDate: string) => new Date(`${civilDate}T12:00:00.000Z`);

/** «8 días» from the first to the last frozen day, both counted. */
export function freezeDays(startsOn: string, endsOn: string): string {
  const days = Math.round((atNoon(endsOn).getTime() - atNoon(startsOn).getTime()) / 86_400_000) + 1;
  return days === 1 ? "1 día" : `${days} días`;
}

/**
 * FIX-090: «vie 20 al dom 22 nov» when the freeze stays in one month, «lun 30
 * nov al vie 4 dic» across two, in the shared list format.
 */
export function freezeRange(startsOn: string, endsOn: string): string {
  const end = formatListDate(endsOn);
  if (startsOn.slice(0, 7) !== endsOn.slice(0, 7)) return `${formatListDate(startsOn)} al ${end}`;
  const [weekday, day] = formatListDate(startsOn).split(" ");
  return `${weekday} ${day} al ${end}`;
}

/** E9 A: «Pide congelar del lun 9 al dom 15 nov (7 días)», «Pidió …» once decided. */
export function freezeRequestLine(freeze: FreezeReviewDto): string {
  const verb = freeze.state === "requested" ? "Pide" : "Pidió";
  const { endsOn, startsOn } = freeze;
  return `${verb} congelar del ${freezeRange(startsOn, endsOn)} (${freezeDays(startsOn, endsOn)})`;
}

/**
 * Where the Client's plan end stands (walkthrough finding 52) as the review
 * table's row (E9 A): «Vencería · vie 12 feb (antes vie 5 feb)» while
 * requested, or undefined when an older API does not send it.
 */
export function freezePlanEndRow(
  freeze: FreezeReviewDto,
): { label: string; value: string } | undefined {
  const { planEndsOn, planEndsOnAfter, state } = freeze;
  if (planEndsOn === undefined) return undefined;
  const before = formatListDate(planEndsOn);
  const moves =
    (state === "requested" || state === "approved") &&
    planEndsOnAfter !== undefined &&
    planEndsOnAfter !== null;
  if (!moves) return { label: "Vence", value: before };
  return {
    label: state === "requested" ? "Vencería" : "Vence",
    value: `${formatListDate(planEndsOnAfter)} (antes ${before})`,
  };
}

const outcome = (freeze: FreezeReviewDto) =>
  freeze.state === "approved"
    ? "Aprobada"
    : freeze.state === "withdrawn"
      ? "Retirada"
      : "Rechazada";

/**
 * «Aprobada por Paola Mendoza el dom 8 nov a las 10:15» in La Paz time,
 * dropping what an older API leaves out; undefined while still requested.
 */
export function freezeDecision(freeze: FreezeReviewDto): string | undefined {
  if (freeze.state === "requested") return undefined;
  // A withdrawal is the Client's own (owner 2026-11-08).
  const by =
    freeze.state === "withdrawn"
      ? " por la clienta"
      : freeze.decidedByName
        ? ` por ${freeze.decidedByName}`
        : "";
  const at = freeze.decidedAt
    ? ` el ${formatListDate(freeze.decidedAt)} a las ${formatStartTime(freeze.decidedAt)}`
    : "";
  return `${outcome(freeze)}${by}${at}`;
}

/** «Aprobada · ahora vence el jue 12 feb» or «Rechazada» for a decided list row. */
export function freezeDecidedDetail(freeze: FreezeReviewDto): string {
  const after = freeze.planEndsOnAfter;
  if (freeze.state !== "approved" || after === undefined || after === null) return outcome(freeze);
  return `Aprobada · ahora vence el ${formatListDate(after)}`;
}
