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

/** C06's «Otras clases de hoy»: one Lino group, hairlines inset 80. */
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

/** One alternative: the start in Lora 20, the class over «Trainer · N cupos», and a radio. */
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
      style={[styles.row, selected && styles.selected]}
      testID={`reschedule-option-${session.id}`}
    >
      <Text numberOfLines={1} style={styles.time}>{formatStartTime(session.startsAt)}</Text>
      <View style={styles.body}>
        <Text style={styles.title}>{session.classTypeName}</Text>
        <Text style={styles.details}>
          {`${session.trainerName} · ${seatsTag(session.availableSeats)}`}
        </Text>
      </View>
      <View style={[styles.radio, selected && styles.radioOn]} testID="reschedule-radio">
        {selected ? <Glyph color={colors.white} name="check" size={14} strokeWidth={2} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: spacing.xxs },
  details: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  group: { ...surfaces.card, overflow: "hidden" },
  hairline: { backgroundColor: colors.hairline, height: 1, marginLeft: 80 },
  radio: {
    alignItems: "center",
    borderColor: colors.hairline,
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
  selected: { backgroundColor: colors.primaryTint },
  time: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: 20,
    fontVariant: ["tabular-nums"],
    // Lora's digits run wider on Android: a fixed width wrapped «09:00».
    minWidth: 52,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.body,
    fontWeight: "500",
  },
});
