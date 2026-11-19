import type { UpcomingBookingDto } from "@pilates/api-contracts";
import { boliviaCivilDate, formatStartTime, useMountedAt } from "@pilates/mobile-core";

import { ClientNextClassHero } from "../booking/next-class-hero";

export { nextBookedClass } from "../booking/next-class-hero";

/** 02's «Tu próxima clase» as the shared next class hero (ClaseE, FIX-089). */
export function NextClassCard({
  booking,
  onPress,
}: {
  booking: UpcomingBookingDto;
  onPress: () => void;
}) {
  const today = boliviaCivilDate(new Date(useMountedAt()));
  const details = `${formatStartTime(booking.startsAt)} · ${booking.trainerName} · ${booking.branchName}`;
  return (
    <ClientNextClassHero
      accessibilityLabel={`Tu próxima clase: ${booking.classTypeName}, ${details}`}
      booking={booking}
      lead="Tu próxima clase"
      onPress={onPress}
      testID="home-next-class"
      today={today}
    />
  );
}
