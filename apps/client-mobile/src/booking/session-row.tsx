import {
  Chevron,
  colors,
  fontFamilies,
  formatStartTime,
  radii,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function seatsTag(availableSeats: number): string {
  if (availableSeats === 0) return "Lleno";
  return availableSeats === 1 ? "1 cupo" : `${availableSeats} cupos`;
}

/** 03's seat pill on v2: seats on Rosa tinte in Rosa enlace, a full class on Arena. */
export function SeatTag({ availableSeats }: { availableSeats: number }) {
  const full = availableSeats === 0;
  return (
    <View style={[styles.pill, full && styles.pillFull]} testID="seat-pill">
      <Text style={[styles.pillLabel, full && styles.pillLabelFull]}>
        {seatsTag(availableSeats)}
      </Text>
    </View>
  );
}

function durationMinutes(startsAt: string, endsAt: string): number {
  return Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60_000);
}

/**
 * A Session on v2 (follow-up 227, 03 and 06): a Lino row, the start in Lora
 * 20, the class over «Trainer · 50 min», the tag, and a quiet chevron. On 03
 * the trainer line leads with her face (FIX-041, follow-up 242), on one line.
 */
export function SessionRow({
  accessibilityLabel,
  end,
  onPress,
  selected,
  session,
  testID,
  trainerFace,
}: {
  accessibilityLabel: string;
  /** What closes the row: the seat pill and the chevron unless told otherwise. */
  end?: ReactNode;
  onPress: () => void;
  selected?: boolean;
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
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={selected === undefined ? undefined : { selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        selected === true && styles.selected,
        pressed && styles.pressed,
      ]}
      testID={testID}
    >
      <Text numberOfLines={1} style={styles.time} testID="session-row-time">
        {formatStartTime(session.startsAt)}
      </Text>
      <View style={styles.body}>
        <Text style={styles.title}>{session.classTypeName}</Text>
        <View style={styles.trainerLine}>
          {trainerFace}
          <Text numberOfLines={1} style={styles.details}>
            {`${session.trainerName} · ${durationMinutes(session.startsAt, session.endsAt)} min`}
          </Text>
        </View>
      </View>
      {end ?? (
        <>
          <SeatTag availableSeats={session.availableSeats} />
          <Chevron size={16} strokeWidth={1.5} tone="muted" />
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: spacing.xxs },
  details: {
    color: colors.textMuted,
    flexShrink: 1,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
  },
  pill: {
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.smLg,
    paddingVertical: spacing.xs,
  },
  pillFull: { backgroundColor: colors.hairline },
  pillLabel: {
    color: colors.primaryOnTint,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.label,
    fontWeight: "600",
  },
  pillLabelFull: { color: colors.text },
  pressed: { opacity: 0.7 },
  row: {
    ...surfaces.card,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 72,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  selected: { borderColor: colors.primary, borderWidth: 1.5 },
  time: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: 20,
    fontVariant: ["tabular-nums"],
    // «09:00» in Lora 20 runs wider than 56 pt on both platforms (more so on
    // Android): a fixed width wrapped it, so 56 is only the floor.
    minWidth: 56,
  },
  trainerLine: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.bodyMedium,
    fontWeight: "500",
  },
});
