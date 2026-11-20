import {
  EmphasisCard,
  formatSessionDate,
  formatSessionMinutes,
  formatStartTime,
  spacing,
  surfaces,
  Text,
} from "@pilates/mobile-core";
import { StyleSheet, View } from "react-native";

type HeroDetail = {
  classType: { name: string };
  endsAt: string;
  startsAt: string;
};

/**
 * C4 A's block: the day as its eyebrow, «08:00 · Mat Pilates» as its title
 * (the screen's one heading, so the header above is only the arrow) and the
 * minutes with the end. `quiet` draws the same on a white card, for a day she
 * cannot book (FIX-082, frozen-plan option B; C04j).
 */
export function SessionHero({ detail, quiet = false }: { detail: HeroDetail; quiet?: boolean }) {
  const title = `${formatStartTime(detail.startsAt)} · ${detail.classType.name}`;
  const note = `${formatSessionMinutes(detail.startsAt, detail.endsAt)} · termina ${formatStartTime(detail.endsAt)}`;
  if (quiet) {
    return (
      <View style={styles.quietHero} testID="session-hero">
        <Text variant="etiqueta">{formatSessionDate(detail.startsAt)}</Text>
        <Text accessibilityRole="header" variant="titulo-bloque">
          {title}
        </Text>
        <Text variant="cuerpo">{note}</Text>
      </View>
    );
  }
  return (
    <EmphasisCard eyebrow={formatSessionDate(detail.startsAt)} testID="session-hero">
      <View style={styles.lines}>
        <Text accessibilityRole="header" tone="onDark" variant="titulo-bloque">
          {title}
        </Text>
        <Text tone="onDark" variant="cuerpo">
          {note}
        </Text>
      </View>
    </EmphasisCard>
  );
}

const styles = StyleSheet.create({
  lines: { gap: spacing.smd },
  quietHero: { ...surfaces.card, gap: spacing.smd, padding: spacing.xlSm },
});
