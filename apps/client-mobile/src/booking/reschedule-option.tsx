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
  TypeBar,
  typography,
} from "@pilates/mobile-core";
import type { ReactNode } from "react";
import { Children, Fragment } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { seatsTag } from "./session-row";

/** C06's «Otras clases de hoy»: one white card, its rows divided by 100 hairlines. */
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
 * One alternative as a class row (Rosa Emma C06): the class type's bar, the
 * start in Lora 22, the class over «Trainer · N de M lugares», and a radio
 * filled in 600 once chosen.
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
      <TypeBar name={session.classTypeName} />
      <Text numberOfLines={1} style={styles.time} testID="reschedule-time">
        {formatStartTime(session.startsAt)}
      </Text>
      <View style={styles.body}>
        <Text style={styles.title}>{session.classTypeName}</Text>
        <Text style={styles.details}>{`${session.trainerName} · ${seatsTag(session)}`}</Text>
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
  body: { flex: 1, gap: spacing.xxs, minWidth: 0 },
  details: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.note },
  group: { ...surfaces.card, overflow: "hidden" },
  hairline: { backgroundColor: colors.hairline, height: 1 },
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
    paddingHorizontal: spacing.mdLg,
    paddingVertical: spacing.md,
  },
  // Lora 22 beside the type bar, wider when Android's digits need it.
  time: {
    color: colors.text,
    flexShrink: 0,
    fontFamily: fontFamilies.display,
    fontSize: typography.titleSecondary,
    fontVariant: ["tabular-nums"],
    minWidth: 62,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.bodyMedium,
    fontWeight: "600",
  },
});
