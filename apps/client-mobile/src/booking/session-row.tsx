import { colors, fontFamilies, formatStartTime, spacing, typography } from "@pilates/mobile-core";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function seatsTag(availableSeats: number): string {
  if (availableSeats === 0) return "Lleno";
  return availableSeats === 1 ? "1 cupo" : `${availableSeats} cupos`;
}

/** At or under this many free seats, the row warns (FIX-082). */
const fewSeats = 2;

/**
 * Reservar option A (FIX-082, design audit 2026-11-18): seats as grey text,
 * and a warning colour, never a pill, only when few are left.
 */
export function SeatsText({ availableSeats }: { availableSeats: number }) {
  const few = availableSeats > 0 && availableSeats <= fewSeats;
  const label = !few
    ? seatsTag(availableSeats)
    : availableSeats === 1
      ? "Queda 1"
      : `Quedan ${availableSeats}`;
  return <Text style={[styles.seats, few && styles.seatsFew]}>{label}</Text>;
}

function durationMinutes(startsAt: string, endsAt: string): number {
  return Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60_000);
}

/**
 * A Session on 03 (follow-up 227): the start in Lora 20, the class over
 * «Trainer · 50 min» and the seats. The trainer line leads with her face
 * (FIX-041, follow-up 242), on one line. FIX-082 (Reservar option A): the
 * rows share one Lino card, split by a hairline, without a chevron.
 */
export function SessionRow({
  accessibilityLabel,
  divided = false,
  onPress,
  selected,
  session,
  testID,
  trainerFace,
}: {
  accessibilityLabel: string;
  /** A hairline above every row of the card but the first. */
  divided?: boolean;
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
        divided && styles.divided,
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
      <SeatsText availableSeats={session.availableSeats} />
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
  divided: { borderTopColor: colors.hairline, borderTopWidth: StyleSheet.hairlineWidth },
  pressed: { opacity: 0.7 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 72,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  seats: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  seatsFew: { color: colors.warningText, fontFamily: fontFamilies.bodyMedium, fontWeight: "500" },
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
