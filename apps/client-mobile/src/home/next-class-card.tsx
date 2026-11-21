import type { UpcomingBookingDto } from "@pilates/api-contracts";
import {
  boliviaCivilDate,
  Chevron,
  formatStartTime,
  spacing,
  surfaces,
  Text,
  TypeBar,
  useMountedAt,
} from "@pilates/mobile-core";
import { Pressable, StyleSheet, View } from "react-native";

import { classDayWord, ClientNextClassHero } from "../booking/next-class-hero";

export { nextBookedClass } from "../booking/next-class-hero";

/**
 * 02's «Tu próxima clase» as the shared next class hero (ClaseE, FIX-089).
 * When a notice already leads Inicio as its one hero (Rosa Emma C02c2), the
 * class turns `quiet`: a white card with the type bar, the `etiqueta` eyebrow,
 * the time and class as its `titulo-bloque` and a chevron.
 */
export function NextClassCard({
  booking,
  onPress,
  quiet = false,
}: {
  booking: UpcomingBookingDto;
  onPress: () => void;
  quiet?: boolean;
}) {
  const today = boliviaCivilDate(new Date(useMountedAt()));
  const details = `${formatStartTime(booking.startsAt)} · ${booking.trainerName} · ${booking.branchName}`;
  const accessibilityLabel = `Tu próxima clase: ${booking.classTypeName}, ${details}`;
  if (!quiet) {
    return (
      <ClientNextClassHero
        accessibilityLabel={accessibilityLabel}
        booking={booking}
        lead="Tu próxima clase"
        onPress={onPress}
        testID="home-next-class"
        today={today}
      />
    );
  }
  const eyebrow = `Tu próxima clase · ${classDayWord(booking.startsAt, today)}`;
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      testID="home-next-class"
    >
      <TypeBar name={booking.classTypeName} />
      <View style={styles.body}>
        <Text variant="etiqueta">{eyebrow}</Text>
        <Text variant="titulo-bloque">
          {`${formatStartTime(booking.startsAt)} · ${booking.classTypeName}`}
        </Text>
        <Text variant="secundario">{`${booking.branchName} · ${booking.trainerName}`}</Text>
      </View>
      <Chevron size={18} strokeWidth={1.7} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: spacing.xxs },
  card: {
    ...surfaces.card,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.mdLg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
  pressed: { opacity: 0.7 },
});
