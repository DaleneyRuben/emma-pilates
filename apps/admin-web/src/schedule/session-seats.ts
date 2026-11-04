import type { AdministratorSessionAvailabilityDto } from "@pilates/api-contracts";

type Session = AdministratorSessionAvailabilityDto;

/** A Session that has started is past: Horario only reads it. */
export const hasStarted = (session: Session, now = Date.now()) =>
  new Date(session.startsAt).getTime() <= now;

/** Seats taken, by the fresher of the week's count and the roster. */
export const seatsTaken = (session: Session, booked: number | undefined) =>
  Math.max(session.bookedCount, booked ?? 0);
