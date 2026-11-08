import type { FreezeReviewDto } from "@pilates/api-contracts";
import { boliviaParts } from "../../lib/bolivia-time";

const shortMonths = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

const civilUtc = (date: string) => new Date(`${date}T00:00:00.000Z`).getTime();

/** «5 feb», as the staff app's freeze rows name a day. */
const shortDay = (date: string): string =>
  `${Number(date.slice(8, 10))} ${shortMonths[Number(date.slice(5, 7)) - 1] ?? ""}`;

/** «7 días» from the first to the last frozen day, both counted. */
export function freezeDayCount(startsOn: string, endsOn: string): string {
  const days =
    Math.round((civilUtc(endsOn) - civilUtc(startsOn)) / 86_400_000) + 1;
  return days === 1 ? "1 día" : `${days} días`;
}

/**
 * «5 feb → 12 feb»: what approving a pending request does to the plan end
 * (walkthrough finding 52); undefined when an older API does not send it.
 */
export function freezePendingPlanEnd(
  freeze: FreezeReviewDto,
): string | undefined {
  const { planEndsOn, planEndsOnAfter } = freeze;
  if (planEndsOn === undefined) return undefined;
  if (planEndsOnAfter === undefined || planEndsOnAfter === null) {
    return shortDay(planEndsOn);
  }
  return `${shortDay(planEndsOn)} → ${shortDay(planEndsOnAfter)}`;
}

/** «12 feb (antes 5 feb)» once approved; the unchanged end when refused. */
export function freezeDecidedPlanEnd(
  freeze: FreezeReviewDto,
): string | undefined {
  const { planEndsOn, planEndsOnAfter, state } = freeze;
  if (planEndsOn === undefined) return undefined;
  if (
    state !== "approved" ||
    planEndsOnAfter === undefined ||
    planEndsOnAfter === null
  ) {
    return shortDay(planEndsOn);
  }
  return `${shortDay(planEndsOnAfter)} (antes ${shortDay(planEndsOn)})`;
}

/**
 * «Decidido por Paola Mendoza · 8 nov 10:15» in La Paz time, dropping what
 * an older API leaves out.
 */
export function freezeDecidedBy(freeze: FreezeReviewDto): string | undefined {
  const { decidedAt, decidedByName } = freeze;
  if (!decidedAt && !decidedByName) return undefined;
  const by = decidedByName ? ` por ${decidedByName}` : "";
  if (!decidedAt) return `Decidido${by}`;
  const parts = boliviaParts(decidedAt);
  return `Decidido${by} · ${shortDay(parts.date)} ${parts.time}`;
}
