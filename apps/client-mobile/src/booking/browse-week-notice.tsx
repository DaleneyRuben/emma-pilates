import {
  addCivilDays,
  colors,
  fontFamilies,
  Glyph,
  spacing,
  surfaces,
  weeklyClassesLeftLine,
} from "@pilates/mobile-core";
import { StyleSheet, Text, View } from "react-native";

/** The Monday of a civil date's week, which the weekly cap counts from. */
export function weekOf(civilDate: string): string {
  const weekday = new Date(`${civilDate}T12:00:00.000Z`).getUTCDay();
  return addCivilDays(civilDate, -((weekday + 6) % 7));
}

/**
 * The notice's line, or none without a weekly cap. The API counts the chosen
 * day's week, so a later week says «esa semana» (review of FIX-082).
 */
export function weekNoticeLine(
  classesLeft: number | null | undefined,
  selectedDate: string,
  today: string,
): string | null {
  if (classesLeft === null || classesLeft === undefined) return null;
  if (weekOf(selectedDate) === weekOf(today)) {
    return classesLeft === 0
      ? "Ya usaste tus clases de esta semana"
      : weeklyClassesLeftLine(classesLeft);
  }
  if (classesLeft === 0) return "Ya usaste tus clases de esa semana";
  return classesLeft === 1
    ? "Esa semana te queda 1 clase"
    : `Esa semana te quedan ${classesLeft} clases`;
}

/**
 * Reservar option A (FIX-082, design audit 2026-11-18): the weekly cap said
 * once above the days instead of under every class, on a white card inside
 * the band (C03, C03f).
 */
export function WeekNotice({
  classesLeft,
  selectedDate,
  today,
}: {
  classesLeft: number | null | undefined;
  selectedDate: string;
  today: string;
}) {
  const line = weekNoticeLine(classesLeft, selectedDate, today);
  if (line === null) return null;
  return (
    <View style={styles.notice} testID="browse-week-notice">
      <Glyph color={colors.textMuted} name="calendar" size={18} strokeWidth={1.5} />
      <Text style={styles.line}>{line}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    color: colors.text,
    flex: 1,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  notice: {
    ...surfaces.card,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.smLg,
    paddingHorizontal: spacing.mdLg,
    paddingVertical: spacing.md,
  },
});
