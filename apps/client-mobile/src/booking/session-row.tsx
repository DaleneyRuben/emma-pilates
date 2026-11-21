import { capacityLabel } from "@pilates/api-contracts";
import { ClassRow, formatStartTime } from "@pilates/mobile-core";

type Seats = { availableSeats: number; bookedCount: number; capacity: number };

/** FIX-090: «9 de 12 lugares», the booked places of the class, or «Lleno». */
export function seatsTag({ availableSeats, bookedCount, capacity }: Seats): string {
  if (availableSeats === 0) return "Lleno";
  return capacityLabel(bookedCount, capacity);
}

/** At or under this many free seats, the row says how few are left (FIX-082). */
const fewSeats = 2;

/**
 * The seats as the row's places (ClaseE, FIX-089): bold Rosa profundo like
 * every other count; «Quedan N» is urgency, not an error colour.
 */
export function seatsLabel(seats: Seats): string {
  const few = seats.availableSeats > 0 && seats.availableSeats <= fewSeats;
  if (!few) return seatsTag(seats);
  return fewSeatsLabel(seats);
}

function fewSeatsLabel(seats: Seats): string {
  return seats.availableSeats === 1 ? "Queda 1 lugar" : `Quedan ${seats.availableSeats} lugares`;
}

/** The row says the places short, «9 de 12», as ClaseE draws them. */
function rowPlaces(seats: Seats): string {
  const label = seatsLabel(seats);
  return label === seatsTag(seats) && seats.availableSeats > 0
    ? `${seats.bookedCount} de ${seats.capacity}`
    : label;
}

function durationMinutes(startsAt: string, endsAt: string): number {
  return Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60_000);
}

/**
 * A Session on Reservar as the shared class row (ClaseE, FIX-089): the start
 * in its Rubor box, the class over «Trainer · 50 min» (her name only, the
 * owner's pick C), the seats at the end and a chevron to the detail. Put the
 * rows in a `ClassList`.
 */
export function SessionRow({
  accessibilityLabel,
  onPress,
  session,
  testID,
}: {
  accessibilityLabel: string;
  onPress: () => void;
  session: Seats & {
    classTypeName: string;
    endsAt: string;
    startsAt: string;
    trainerName: string;
  };
  testID?: string;
}) {
  return (
    <ClassRow
      accessibilityLabel={accessibilityLabel}
      detail={`${session.trainerName} · ${durationMinutes(session.startsAt, session.endsAt)} min`}
      detailLines={1}
      onPress={onPress}
      places={rowPlaces(session)}
      testID={testID}
      time={formatStartTime(session.startsAt)}
      title={session.classTypeName}
    />
  );
}
