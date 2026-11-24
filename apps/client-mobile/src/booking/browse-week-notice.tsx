import {
  addCivilDays,
  colors,
  Glyph,
  radii,
  spacing,
  surfaces,
  Text,
  weeklyClassesLeftLine,
} from "@pilates/mobile-core";
import { StyleSheet, View } from "react-native";

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
  pill = false,
  selectedDate,
  today,
}: {
  classesLeft: number | null | undefined;
  /** 03T: a white 40 pt pill beside the Branch's, as the tablet band draws it. */
  pill?: boolean;
  selectedDate: string;
  today: string;
}) {
  const line = weekNoticeLine(classesLeft, selectedDate, today);
  if (line === null) return null;
  return (
    <View style={pill ? styles.pill : styles.notice} testID="browse-week-notice">
      <Glyph color={colors.textMuted} name="calendar" size={pill ? 16 : 18} strokeWidth={1.5} />
      <Text style={pill ? undefined : styles.line} variant={pill ? "compacto-600" : "titulo-fila"}>
        {line}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flex: 1 },
  pill: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 40,
    paddingHorizontal: spacing.mdLg,
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
