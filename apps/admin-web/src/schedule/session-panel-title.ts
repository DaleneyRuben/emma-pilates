import { capacityLabel, formatDateTime } from "@pilates/api-contracts";
import type {
  AdministratorSessionAvailabilityDto,
  AdministratorSessionRosterDto,
} from "@pilates/api-contracts";
import { seatsTaken } from "./session-seats";

type Session = AdministratorSessionAvailabilityDto;

/** FIX-091 (W1, Editar clase A): «Lun 23 nov · 07:00 · Reformer Pilates». */
export function classPanelTitle(session: Session): string {
  const when = formatDateTime(session.startsAt);
  return `${when.charAt(0).toLocaleUpperCase("es")}${when.slice(1)} · ${session.classTypeName}`;
}

// AW03: «8 de 10 lugares · 3 en lista de espera» (invariant 4), then the
// Instructora. The roster refreshes after a booking while the panel keeps the
// Session it opened with, so its counts win (finding 81).
export function classOccupancyLine(
  session: Session,
  roster: AdministratorSessionRosterDto | undefined,
): string {
  const waiting = Math.max(session.waitlistCount, roster?.waitlist.length ?? 0);
  return [
    capacityLabel(
      seatsTaken(session, roster?.bookings.length),
      session.capacity,
    ),
    ...(waiting > 0 ? [`${waiting} en lista de espera`] : []),
    session.trainerName,
  ].join(" · ");
}
