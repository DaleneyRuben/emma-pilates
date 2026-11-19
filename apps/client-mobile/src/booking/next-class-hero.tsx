import type { UpcomingBookingDto } from "@pilates/api-contracts";
import {
  addCivilDays,
  boliviaCivilDate,
  dayChipLabel,
  formatStartTime,
  NextClassHero,
} from "@pilates/mobile-core";

import { freePlacesLabel } from "./free-places";

/** The first booked class (not a waitlist place), or none. */
export function nextBookedClass(items: readonly UpcomingBookingDto[]) {
  return items.find((item) => item.kind === "booking");
}

/** «hoy», «mañana» or «mar 3»: the day of the class, read after the lead. */
export function classDayWord(startsAt: string, today: string): string {
  const day = boliviaCivilDate(new Date(startsAt));
  if (day === today) return "hoy";
  if (day === addCivilDays(today, 1)) return "mañana";
  const label = dayChipLabel(day);
  return `${label.weekday} ${label.day}`;
}

/**
 * The Client's next class as the shared Palo de rosa hero (ClaseE, FIX-089):
 * «PRÓXIMA · HOY», «08:00 · Mat Pilates», then the branch and the trainer,
 * the free places and who else is coming by initials.
 */
export function ClientNextClassHero({
  accessibilityLabel,
  booking,
  detail,
  lead = "Próxima",
  onPress,
  testID,
  today,
}: {
  accessibilityLabel?: string;
  booking: UpcomingBookingDto;
  /** Replaces «branch · trainer», such as the Cancellation Window's note. */
  detail?: string;
  lead?: string;
  onPress?: () => void;
  testID: string;
  today: string;
}) {
  return (
    <NextClassHero
      accessibilityLabel={accessibilityLabel}
      attendees={booking.attendeeInitials ?? []}
      detail={detail ?? `${booking.branchName} · ${booking.trainerName}`}
      eyebrow={`${lead} · ${classDayWord(booking.startsAt, today)}`}
      onPress={onPress}
      places={
        // A server older than the attendee read leaves the places out.
        booking.capacity === undefined || booking.bookedCount === undefined
          ? undefined
          : freePlacesLabel(booking.capacity - booking.bookedCount, booking.capacity)
      }
      testID={testID}
      title={`${formatStartTime(booking.startsAt)} · ${booking.classTypeName}`}
    />
  );
}
