import {
  attendeesLabel,
  colors,
  fontFamilies,
  formatCancellationWindow,
  formatStartTime,
  formatTimeRange,
  HeroAttendees,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useBookingAction } from "./booking-card";
import { freePlacesLabel } from "./free-places";
import { classDayWord } from "./next-class-hero";

/**
 * C05's next booked class: the 600 hero with the day, the time and the class,
 * the branch and the trainer (or the Cancellation Window's note), who else is
 * coming, and its action as a white underlined link at the hero's foot.
 */
export function NextBookingHero({
  today,
  ...props
}: Parameters<typeof useBookingAction>[0] & { today: string }) {
  const { action, insideWindow } = useBookingAction(props);
  const { cancellationWindowMinutes: window, item } = props;
  const attendees = item.attendeeInitials ?? [];
  const eyebrow = `Próxima · ${classDayWord(item.startsAt, today)}`;
  const title = `${formatStartTime(item.startsAt)} · ${item.classTypeName}`;
  const detail =
    insideWindow && window !== undefined
      ? `${formatTimeRange(item.startsAt, item.endsAt)} · faltan menos de ${formatCancellationWindow(window)}`
      : `${item.branchName} · ${item.trainerName}`;
  // A server older than the attendee read leaves the places out.
  const places =
    item.capacity === undefined || item.bookedCount === undefined
      ? undefined
      : freePlacesLabel(item.capacity - item.bookedCount, item.capacity);
  const label = [
    [eyebrow, title, places, detail].filter(Boolean).join(", "),
    attendees.length === 0 ? undefined : attendeesLabel(attendees.length),
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <View style={styles.hero} testID="bookings-next-class">
      <View accessibilityLabel={label} accessible style={styles.content}>
        <View style={styles.top}>
          <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text>
          {places === undefined ? null : <Text style={styles.places}>{places}</Text>}
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.detail}>{detail}</Text>
        <HeroAttendees initials={attendees} />
      </View>
      {action === null ? null : (
        <View style={styles.actionRow}>
          <Pressable
            accessibilityLabel={action.label}
            accessibilityRole="button"
            hitSlop={spacing.sm}
            onPress={action.onPress}
            style={styles.action}
            testID={action.testID}
          >
            <Text style={styles.actionLabel}>{action.label}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  action: { justifyContent: "center", minHeight: 32 },
  actionLabel: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.body,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  actionRow: { alignItems: "flex-end" },
  content: { gap: spacing.smd },
  detail: { color: colors.onEmphasis, fontFamily: fontFamilies.body, fontSize: 14, lineHeight: 20 },
  eyebrow: {
    color: colors.onEmphasis,
    flexShrink: 1,
    fontFamily: fontFamilies.bodyBold,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 12 * 0.14,
  },
  hero: { ...surfaces.emphasis, gap: spacing.xs, padding: spacing.xlSm },
  places: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.note,
    fontWeight: "700",
  },
  title: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.display,
    fontSize: typography.hero,
    lineHeight: 31,
  },
  top: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
});
