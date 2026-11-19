import {
  colors,
  EmphasisCard,
  fontFamilies,
  formatSessionDate,
  formatSessionMinutes,
  formatStartTime,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { StyleSheet, Text, View } from "react-native";

type HeroDetail = {
  classType: { name: string };
  endsAt: string;
  startsAt: string;
};

/**
 * C4 A's block: the day as its eyebrow, «08:00 · Mat Pilates» as its title
 * (the screen's one heading, so the header above is only the arrow) and the
 * minutes with the end. `quiet` draws the same on a Crema card, for a day she
 * cannot book (FIX-082, frozen-plan option B).
 */
export function SessionHero({ detail, quiet = false }: { detail: HeroDetail; quiet?: boolean }) {
  const title = `${formatStartTime(detail.startsAt)} · ${detail.classType.name}`;
  const note = `${formatSessionMinutes(detail.startsAt, detail.endsAt)} · termina ${formatStartTime(detail.endsAt)}`;
  if (quiet) {
    return (
      <View style={styles.quietHero} testID="session-hero">
        <Text style={styles.quietEyebrow}>{formatSessionDate(detail.startsAt)}</Text>
        <Text accessibilityRole="header" style={[styles.title, styles.quietText]}>
          {title}
        </Text>
        <Text style={styles.quietNote}>{note}</Text>
      </View>
    );
  }
  return (
    <EmphasisCard eyebrow={formatSessionDate(detail.startsAt)} testID="session-hero">
      <View style={styles.lines}>
        <Text accessibilityRole="header" style={[styles.title, styles.onEmphasis]}>
          {title}
        </Text>
        <Text style={[styles.note, styles.onEmphasis]}>{note}</Text>
      </View>
    </EmphasisCard>
  );
}

const styles = StyleSheet.create({
  lines: { gap: spacing.smd },
  note: { fontFamily: fontFamilies.bodyMedium, fontSize: 14, fontWeight: "500" },
  onEmphasis: { color: colors.onEmphasis },
  quietEyebrow: {
    color: colors.text,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.label,
    fontWeight: "500",
    letterSpacing: typography.label * 0.12,
    textTransform: "uppercase",
  },
  quietHero: { ...surfaces.card, gap: spacing.sm, padding: spacing.xlSm },
  quietNote: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.body },
  quietText: { color: colors.text },
  title: { fontFamily: fontFamilies.display, fontSize: 28, lineHeight: 32 },
});
