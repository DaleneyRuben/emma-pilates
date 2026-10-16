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
// slot that opens «Nueva sesión» there. Slots sit before the blocks of the
// same start in the DOM, so Tab follows the day and blocks paint on top.
export function dayItems(
  day: string,
  hours: number[],
  sessions: readonly Session[],
) {
  const ofDay = sessions.filter(
    (session) => boliviaParts(session.startsAt).date === day,
  );
  const spans = ofDay.map(sessionSpan);
  const slots = hours
    .filter(
      (hour) =>
        !spans.some(
          ({ start, end }) => start <= hour * 60 && end >= (hour + 1) * 60,
        ),
    )
    .map((hour) => ({ kind: "slot" as const, hour, minutes: hour * 60 }));
  const blocks = ofDay.map((session, index) => ({
    kind: "session" as const,
    session,
    minutes: spans[index]?.start ?? 0,
  }));
  return [...slots, ...blocks].sort(
    (a, b) =>
      a.minutes - b.minutes ||
      (a.kind === b.kind ? 0 : a.kind === "slot" ? -1 : 1),
  );
}
