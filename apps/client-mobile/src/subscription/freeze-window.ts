import { addCivilDays } from "@pilates/mobile-core";

// Walkthrough finding 51: the Freeze rules of booking ADR-0010 and the
// backend's freeze.ts, so Congelar plan refuses before sending and says why:
// the first day is today or later, the last on or before the term's end, at
// most 15 days, and the moved end stays before a queued next plan.
export const maxFreezeDays = 15;

const weekdays = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const months = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const asDate = (civil: string) => new Date(`${civil}T12:00:00.000Z`);

/** Whole days from one civil date to another. */
export function civilDaysBetween(from: string, to: string): number {
  return Math.round((asDate(to).getTime() - asDate(from).getTime()) / 86_400_000);
}

/** «30 de enero». */
export function dayMonth(civil: string): string {
  const date = asDate(civil);
  return `${date.getUTCDate()} de ${months[date.getUTCMonth()]}`;
}

/** «lun 16 de noviembre». */
export function weekdayDayMonth(civil: string): string {
  return `${weekdays[asDate(civil).getUTCDay()]} ${dayMonth(civil)}`;
}

export type FreezeTerm = {
  today: string;
  termStartsOn: string;
  termEndsOn: string;
  queuedPlanStartsOn: string | null;
};

export type FreezeWindow = {
  available: boolean;
  unavailableReason: string | null;
  firstDay: string;
  lastDay: string;
  maxDays(start: string): number;
  /** Why a day can't be picked: as a first day, or as the last after `start`. */
  whyOff(day: string, start: string | null): string | null;
};

export function freezeWindow(term: FreezeTerm): FreezeWindow {
  const queuedCap =
    term.queuedPlanStartsOn === null
      ? maxFreezeDays
      : civilDaysBetween(term.termEndsOn, term.queuedPlanStartsOn) - 1;
  const firstDay = term.today > term.termStartsOn ? term.today : term.termStartsOn;
  const endReason = `Tu plan vence el ${dayMonth(term.termEndsOn)}: el congelamiento tiene que terminar ese día o antes.`;
  const queuedReason = (days: number) =>
    `Tu plan siguiente empieza el ${dayMonth(term.queuedPlanStartsOn ?? term.termEndsOn)}: puedes congelar hasta ${days === 1 ? "1 día" : `${days} días`}.`;
  const maxDays = (start: string) =>
    Math.min(maxFreezeDays, civilDaysBetween(start, term.termEndsOn) + 1, queuedCap);
  const unavailableReason =
    queuedCap < 1
      ? `Tu plan siguiente empieza el ${dayMonth(term.queuedPlanStartsOn ?? term.termEndsOn)}, al día siguiente de que vence este: ya no se puede congelar.`
      : firstDay > term.termEndsOn
        ? endReason
        : null;
  return {
    available: unavailableReason === null,
    unavailableReason,
    firstDay,
    lastDay: term.termEndsOn,
    maxDays,
    whyOff(day, start) {
      if (day < term.today) return "Ese día ya pasó. El congelamiento empieza hoy o después.";
      if (day > term.termEndsOn) return endReason;
      if (start === null || day < start) return null;
      const max = maxDays(start);
      if (civilDaysBetween(start, day) + 1 <= max) return null;
      if (max === queuedCap && queuedCap < maxFreezeDays) return queuedReason(max);
      if (max === civilDaysBetween(start, term.termEndsOn) + 1) return endReason;
      return `Puedes congelar hasta ${maxFreezeDays} días: el último día posible es el ${weekdayDayMonth(addCivilDays(start, maxFreezeDays - 1))}.`;
    },
  };
}

export type FreezeSummary = {
  range: string;
  days: string;
  frozenDays: number;
  newEndsOn: string;
  newEnd: string;
  was: string;
};

/** The summary card: «Del lun 16 al dom 22 de noviembre», days, moved end. */
export function freezeSummary(termEndsOn: string, start: string, end: string): FreezeSummary {
  const frozenDays = civilDaysBetween(start, end) + 1;
  const newEndsOn = addCivilDays(termEndsOn, frozenDays);
  return {
    range: freezeRange(start, end),
    days: frozenDays === 1 ? "1 día" : `${frozenDays} días`,
    frozenDays,
    newEndsOn,
    newEnd: weekdayDayMonth(newEndsOn),
    was: `antes, el ${dayMonth(termEndsOn)}`,
  };
}

/** «Del lun 16 al dom 22 de noviembre», both months when it crosses one. */
export function freezeRange(start: string, end: string): string {
  if (start === end) return `El ${weekdayDayMonth(start)}`;
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  const first = sameMonth
    ? `${weekdays[asDate(start).getUTCDay()]} ${asDate(start).getUTCDate()}`
    : weekdayDayMonth(start);
  return `Del ${first} al ${weekdayDayMonth(end)}`;
}

/**
 * The API answers every refused request as `freeze_not_allowed`. Once the
 * plan is read again, this names what failed, or null when nothing explains
 * it (the caller then says it generically).
 */
export function freezeRefusal(
  facts: FreezeTerm & { freezeState: "requested" | "approved" | "refused" | null },
  start: string,
  end: string,
): string | null {
  if (facts.freezeState === "requested" || facts.freezeState === "approved") {
    return "Ya pediste un congelamiento para este plan.";
  }
  const window = freezeWindow(facts);
  if (!window.available) return window.unavailableReason;
  return window.whyOff(start, null) ?? window.whyOff(end, start);
}
