import type { AdministratorSessionAvailabilityDto } from "@pilates/api-contracts";
import { boliviaParts } from "../lib/bolivia-time";

type Session = AdministratorSessionAvailabilityDto;

export const hourLabel = (hour: number) =>
  `${String(hour).padStart(2, "0")}:00`;

/** Minutes of a Session on its Bolivia start day, clipped at midnight. */
export function sessionSpan(session: Session) {
  const start = boliviaParts(session.startsAt);
  const end = boliviaParts(session.endsAt);
  return {
    start: start.minutes,
    end: end.date === start.date ? end.minutes : 24 * 60,
  };
}

// Follow-up 96: every hour of a day that no Session fully covers is an empty
// slot that opens «Nueva clase» there. Slots sit before the blocks of the
// same start in the DOM, so Tab follows the day and blocks paint on top.
// A cancelled class is only a thin line (FIX-091), so its hour stays free.
export function dayItems(
  day: string,
  hours: number[],
  sessions: readonly Session[],
) {
  const ofDay = sessions.filter(
    (session) => boliviaParts(session.startsAt).date === day,
  );
  const spans = ofDay.map(sessionSpan);
  const held = ofDay
    .filter((session) => (session.cancellation ?? null) === null)
    .map(sessionSpan);
  const slots = hours
    .filter(
      (hour) =>
        !held.some(
          ({ start, end }) => start <= hour * 60 && end >= (hour + 1) * 60,
        ),
    )
    .map((hour) => ({ kind: "slot" as const, hour, minutes: hour * 60 }));
  const blocks = ofDay.map((session, index) => ({
    kind: "session" as const,
    session,
    minutes: spans[index]?.start ?? 0,
  }));
  // A slot paints first, then a cancelled class, then a live one, so a
  // replacement created over a cancelled class sits on top (FIX-042).
  const layer = (item: (typeof slots)[number] | (typeof blocks)[number]) =>
    item.kind === "slot" ? 0 : (item.session.cancellation ?? null) ? 1 : 2;
  return [...slots, ...blocks].sort(
    (a, b) => a.minutes - b.minutes || layer(a) - layer(b),
  );
}
