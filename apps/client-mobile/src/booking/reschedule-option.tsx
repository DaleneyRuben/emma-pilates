import type { SessionAvailabilityDto } from "@pilates/api-contracts";
import {
  colors,
  fontFamilies,
  formatStartTime,
  formatTimeRange,
  Glyph,
  radii,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import type { ReactNode } from "react";
import { Children, Fragment } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { seatsTag } from "./session-row";

/** C06's «Otras clases de hoy»: one Crema card, Rubor hairlines inset 88 (ClaseE). */
export function RescheduleOptions({ children }: { children: ReactNode }) {
  return (
    <View style={styles.group} testID="reschedule-options">
      {Children.toArray(children).map((child, index) => (
        <Fragment key={index}>
          {index === 0 ? null : <View style={styles.hairline} />}
          {child}
        </Fragment>
      ))}
    </View>
  );
}

/**
 * One alternative as a class row (ClaseE, FIX-089): the start in its Rubor
 * box, the class over «Trainer · N cupos», and a radio filled in Rosa
 * profundo once chosen.
 */
export function RescheduleOption({
  onPress,
  selected,
  session,
}: {
  onPress: () => void;
  selected: boolean;
  session: SessionAvailabilityDto;
}) {
  return (
    <Pressable
      accessibilityLabel={`${session.classTypeName} ${formatTimeRange(session.startsAt, session.endsAt)}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={styles.row}
      testID={`reschedule-option-${session.id}`}
    >
      <View style={styles.timeBox} testID="reschedule-time">
        <Text numberOfLines={1} style={styles.time}>
          {formatStartTime(session.startsAt)}
        </Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{session.classTypeName}</Text>
        <Text style={styles.details}>
          {`${session.trainerName} · ${seatsTag(session.availableSeats)}`}
        </Text>
      </View>
      <View style={[styles.radio, selected && styles.radioOn]} testID="reschedule-radio">
        {selected ? (
          <Glyph color={colors.onPrimary} name="check" size={14} strokeWidth={2} />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: spacing.xxs },
  details: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.note },
  group: { ...surfaces.card, overflow: "hidden" },
  hairline: { backgroundColor: colors.hairline, height: 1, marginLeft: 88 },
  radio: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  radioOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
  },
  time: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.body,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  // ClaseE's time box: 62 × 36, wider when Android's digits need it.
  timeBox: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
    minWidth: 62,
    paddingHorizontal: spacing.sm,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.body,
    fontWeight: "500",
  },
});
