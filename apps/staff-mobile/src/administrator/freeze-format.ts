import type { FreezeReviewDto } from "@pilates/api-contracts";
import { boliviaCivilDate, formatStartTime } from "@pilates/mobile-core";

import { formatCivilDayMonth } from "../assistant/assistant-format";

const monthFormatters = {
  long: new Intl.DateTimeFormat("es-BO", { month: "long", timeZone: "UTC" }),
  short: new Intl.DateTimeFormat("es-BO", { month: "short", timeZone: "UTC" }),
};

type MonthStyle = keyof typeof monthFormatters;

const atNoon = (civilDate: string) => new Date(`${civilDate}T12:00:00.000Z`);

const monthOf = (civilDate: string, style: MonthStyle) =>
  monthFormatters[style].format(atNoon(civilDate)).replace(/\./g, "");

const dayOf = (civilDate: string) => String(atNoon(civilDate).getUTCDate());

/** «5 de febrero», or «5 feb» for a list row. */
const dayMonth = (civilDate: string, style: MonthStyle) =>
  style === "long"
    ? formatCivilDayMonth(civilDate)
    : `${dayOf(civilDate)} ${monthOf(civilDate, "short")}`;

/** «8 días» from the first to the last frozen day, both counted. */
export function freezeDays(startsOn: string, endsOn: string): string {
  const days = Math.round((atNoon(endsOn).getTime() - atNoon(startsOn).getTime()) / 86_400_000) + 1;
  return days === 1 ? "1 día" : `${days} días`;
}

/**
 * «9 al 15 de noviembre» when the freeze stays in one month, «30 de noviembre
 * al 4 de diciembre» across two; «short» writes «9 al 15 nov» for a list row.
 */
export function freezeRange(startsOn: string, endsOn: string, style: MonthStyle = "long"): string {
  const end = dayMonth(endsOn, style);
  if (startsOn.slice(0, 7) === endsOn.slice(0, 7)) return `${dayOf(startsOn)} al ${end}`;
  return `${dayMonth(startsOn, style)} al ${end}`;
}

/**
 * Where the Client's plan end stands (walkthrough finding 52), or undefined
 * when an older API does not send it.
 */
export function freezePlanEnd(freeze: FreezeReviewDto): string | undefined {
  const { planEndsOn, planEndsOnAfter, state } = freeze;
  if (planEndsOn === undefined) return undefined;
  const before = formatCivilDayMonth(planEndsOn);
  const after =
    planEndsOnAfter === undefined || planEndsOnAfter === null
      ? undefined
      : formatCivilDayMonth(planEndsOnAfter);
  if (state === "approved") {
    return after === undefined ? undefined : `Ahora vence el ${after} (antes, el ${before})`;
  }
  if (state === "requested" && after !== undefined) return `Vence el ${before} → ${after}`;
  return `Vence el ${before}`;
}

const outcome = (freeze: FreezeReviewDto) =>
  freeze.state === "approved"
    ? "Aprobada"
    : freeze.state === "withdrawn"
      ? "Retirada"
      : "Rechazada";

/**
 * «Aprobada por Paola Mendoza el 8 de noviembre a las 10:15» in La Paz time,
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
    ? ` el ${formatCivilDayMonth(boliviaCivilDate(new Date(freeze.decidedAt)))} a las ${formatStartTime(freeze.decidedAt)}`
    : "";
  return `${outcome(freeze)}${by}${at}`;
}

/** «Aprobada · ahora vence el 12 feb» or «Rechazada» for a decided list row. */
export function freezeDecidedDetail(freeze: FreezeReviewDto): string {
  const after = freeze.planEndsOnAfter;
  if (freeze.state !== "approved" || after === undefined || after === null) return outcome(freeze);
  return `Aprobada · ahora vence el ${dayMonth(after, "short")}`;
}
