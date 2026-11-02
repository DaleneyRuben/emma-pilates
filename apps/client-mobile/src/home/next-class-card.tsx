import type { UpcomingBookingDto } from "@pilates/api-contracts";
import {
  boliviaCivilDate,
  Chevron,
  colors,
  dayChipLabel,
  fontFamilies,
  formatStartTime,
  radii,
  SectionTitle,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { Pressable, StyleSheet, Text, View } from "react-native";

/** The first booked class (not a waitlist place), or none. */
export function nextBookedClass(items: readonly UpcomingBookingDto[]) {
  return items.find((item) => item.kind === "booking");
}

/** 02's «Tu próxima clase»: a day tile, the class in Lora 18, and the details on one line. */
export function NextClassCard({
  booking,
  onPress,
}: {
  booking: UpcomingBookingDto;
  onPress: () => void;
}) {
  const day = dayChipLabel(boliviaCivilDate(new Date(booking.startsAt)));
  const details = `${formatStartTime(booking.startsAt)} · ${booking.trainerName} · ${booking.branchName}`;
  return (
    <View>
      <SectionTitle>Tu próxima clase</SectionTitle>
      <Pressable
        accessibilityLabel={`Tu próxima clase: ${booking.classTypeName}, ${details}`}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        testID="home-next-class"
      >
        <View style={styles.day}>
          <Text style={styles.weekday}>{day.weekday}</Text>
          <Text style={styles.dayNumber}>{day.day}</Text>
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>{booking.classTypeName}</Text>
          <Text style={styles.details}>{details}</Text>
        </View>
        <Chevron size={16} strokeWidth={1.5} tone="muted" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: spacing.xxs },
  card: {
    ...surfaces.card,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
  },
  day: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: radii.button,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  dayNumber: {
    color: colors.primaryOnTint,
    fontFamily: fontFamilies.display,
    fontSize: 20,
    lineHeight: 22,
  },
  details: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  pressed: { opacity: 0.7 },
  title: { color: colors.text, fontFamily: fontFamilies.display, fontSize: 18 },
  weekday: {
    color: colors.primaryOnTint,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.tabLabel,
    fontWeight: "600",
    textTransform: "uppercase",
  },
});
