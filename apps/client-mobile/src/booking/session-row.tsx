import { ClassRow, formatStartTime } from "@pilates/mobile-core";
import type { ReactNode } from "react";

export function seatsTag(availableSeats: number): string {
  if (availableSeats === 0) return "Lleno";
  return availableSeats === 1 ? "1 cupo" : `${availableSeats} cupos`;
}

/** At or under this many free seats, the row says how few are left (FIX-082). */
const fewSeats = 2;

/**
 * The seats as the row's places (ClaseE, FIX-089): bold Rosa profundo like
 * every other count; «Quedan N» is urgency, not an error colour.
 */
export function seatsLabel(availableSeats: number): string {
  const few = availableSeats > 0 && availableSeats <= fewSeats;
  if (!few) return seatsTag(availableSeats);
  return availableSeats === 1 ? "Queda 1 cupo" : `Quedan ${availableSeats} cupos`;
}

function durationMinutes(startsAt: string, endsAt: string): number {
  return Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60_000);
}

/**
 * A Session on Reservar as the shared class row (ClaseE, FIX-089): the start
 * in its Rubor box, the class over «Trainer · 50 min» led by her face
 * (FIX-041), the seats at the end and a chevron to the detail. Put the rows
 * in a `ClassList`.
 */
export function SessionRow({
  accessibilityLabel,
  onPress,
  session,
  testID,
  trainerFace,
}: {
  accessibilityLabel: string;
  onPress: () => void;
  session: {
    availableSeats: number;
    classTypeName: string;
    endsAt: string;
    startsAt: string;
    trainerName: string;
  };
  testID?: string;
  trainerFace?: ReactNode;
}) {
  return (
    <ClassRow
      accessibilityLabel={accessibilityLabel}
      detail={`${session.trainerName} · ${durationMinutes(session.startsAt, session.endsAt)} min`}
      detailLead={trainerFace}
      detailLines={1}
      onPress={onPress}
      places={seatsLabel(session.availableSeats)}
      testID={testID}
      time={formatStartTime(session.startsAt)}
      title={session.classTypeName}
    />
  );
}
