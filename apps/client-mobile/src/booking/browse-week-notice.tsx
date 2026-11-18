import {
  colors,
  fontFamilies,
  Glyph,
  radii,
  spacing,
  weeklyClassesLeftLine,
} from "@pilates/mobile-core";
import { StyleSheet, Text, View } from "react-native";

/** The notice's line, or none without a weekly cap. */
export function weekNoticeLine(classesLeftThisWeek: number | null | undefined): string | null {
  if (classesLeftThisWeek === 0) return "Ya usaste tus clases de esta semana";
  return weeklyClassesLeftLine(classesLeftThisWeek);
}

/**
 * Reservar option A (FIX-082, design audit 2026-11-18): the weekly cap said
 * once above the days instead of under every class, on Lino with a plain
 * muted icon.
 */
export function WeekNotice({
  classesLeftThisWeek,
}: {
  classesLeftThisWeek: number | null | undefined;
}) {
  const line = weekNoticeLine(classesLeftThisWeek);
  if (line === null) return null;
  return (
    <View style={styles.notice} testID="browse-week-notice">
      <Glyph color={colors.textMuted} name="calendar" size={18} strokeWidth={1.5} />
      <Text style={styles.line}>{line}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { color: colors.text, flex: 1, fontFamily: fontFamilies.body, fontSize: 14 },
  notice: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radii.inset,
    flexDirection: "row",
    gap: spacing.smLg,
    paddingHorizontal: spacing.mdLg,
    paddingVertical: spacing.md,
  },
});
