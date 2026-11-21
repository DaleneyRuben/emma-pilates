import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { CardFooter } from "../ui/card-footer";
import { Chevron } from "../ui/chevron";
import { Glyph } from "../ui/glyph";
import { Text } from "../ui/text";
import { colors, spacing, surfaces } from "../ui/tokens";

/**
 * The Session card of 03 and S07 (MOB-042): a spaced 12 pt time over a Lora
 * 19 title with the seat pill on the right, then the Trainer and the chevron
 * under a rule. 06's option (MOB-048) is the same card with the pill as the
 * footer's end instead of the chevron and a 2 px Palo de rosa border once
 * selected (README «Cards»: selection by the border alone).
 */
export function SessionCard({
  accessibilityLabel,
  footerEnd = <Chevron />,
  onPress,
  selected,
  tag,
  testID,
  time,
  title,
  trainerFace,
  trainerName,
}: {
  accessibilityLabel: string;
  footerEnd?: ReactNode;
  onPress: () => void;
  selected?: boolean;
  tag?: ReactNode;
  testID?: string;
  time: string;
  title: string;
  /** FIX-041: the Trainer's photo in place of the person glyph. */
  trainerFace?: ReactNode;
  trainerName: string;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={selected === undefined ? undefined : { selected }}
      onPress={onPress}
      style={[styles.card, selected === true && styles.cardSelected]}
      testID={testID}
    >
      <View style={styles.header}>
        <View style={styles.titles}>
          <Text variant="cifra">{time}</Text>
          <Text variant="titulo-fila">{title}</Text>
        </View>
        {tag}
      </View>
      <CardFooter>
        <View style={styles.faceLine}>
          {trainerFace ?? <Glyph name="person" size={17} />}
          <Text style={styles.trainer} variant="secundario">
            {trainerName}
          </Text>
        </View>
        {footerEnd}
      </CardFooter>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { ...surfaces.card, gap: spacing.md, padding: spacing.lgXl },
  cardSelected: { borderColor: colors.primary, borderWidth: 2 },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  titles: { flexShrink: 1, gap: spacing.xs },
  faceLine: { alignItems: "center", flexDirection: "row", flexShrink: 1, gap: spacing.sm },
  trainer: { flexShrink: 1 },
});
