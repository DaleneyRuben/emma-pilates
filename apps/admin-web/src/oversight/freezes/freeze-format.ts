import {
  formatDateTime,
  formatListDate,
  type FreezeReviewDto,
} from "@pilates/api-contracts";

const civilUtc = (date: string) => new Date(`${date}T00:00:00.000Z`).getTime();

/** «jue 5 feb», the shared list date (FIX-090). */
const shortDay = (date: string): string => formatListDate(date);

/** «7 días» from the first to the last frozen day, both counted. */
export function freezeDayCount(startsOn: string, endsOn: string): string {
  const days =
    Math.round((civilUtc(endsOn) - civilUtc(startsOn)) / 86_400_000) + 1;
  return days === 1 ? "1 día" : `${days} días`;
}

/**
 * «jue 12 feb (antes jue 5 feb)»: what approving a pending request does to
 * the plan end (walkthrough finding 52; FIX-091 W16 B words it as the review
 * panel's «Vencería»); undefined when an older API does not send it.
 */
export function freezePendingPlanEnd(
  freeze: FreezeReviewDto,
): string | undefined {
  const { planEndsOn, planEndsOnAfter } = freeze;
  if (planEndsOn === undefined) return undefined;
  if (planEndsOnAfter === undefined || planEndsOnAfter === null) {
    return shortDay(planEndsOn);
  }
  return `${shortDay(planEndsOnAfter)} (antes ${shortDay(planEndsOn)})`;
}

/** «jue 12 feb (antes jue 5 feb)» once approved; the unchanged end when refused. */
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
 * «Decidido por Paola Mendoza · dom 8 nov · 10:15» in La Paz time, dropping what
 * an older API leaves out.
 */
export function freezeDecidedBy(freeze: FreezeReviewDto): string | undefined {
  const { decidedAt, decidedByName } = freeze;
  // A withdrawal is the Client's own (owner 2026-11-08), never a refusal.
  const withdrawn = freeze.state === "withdrawn";
  if (!decidedAt && !decidedByName && !withdrawn) return undefined;
  const verb = withdrawn ? "Retirado" : "Decidido";
  const by = withdrawn
    ? " por la clienta"
    : decidedByName
      ? ` por ${decidedByName}`
      : "";
  if (!decidedAt) return `${verb}${by}`;
  return `${verb}${by} · ${formatDateTime(decidedAt)}`;
}
