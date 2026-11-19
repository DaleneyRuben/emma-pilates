import { hasStarted } from "@pilates/mobile-core";

const hour = 60;

/** The first class of the list that has not started yet: the agenda's hero (ClaseE). */
export function nextClass<T extends { startsAt: string }>(
  sessions: readonly T[],
  now: Date,
): T | undefined {
  return sessions.find((session) => !hasStarted(session.startsAt, now));
}

/** «Próxima · en 40 min» within the hour, «Próxima» further off (FIX-089). */
export function nextClassEyebrow(startsAt: string, now: Date): string {
  const minutes = Math.ceil((new Date(startsAt).getTime() - now.getTime()) / 60_000);
  return minutes <= hour ? `Próxima · en ${minutes} min` : "Próxima";
}
