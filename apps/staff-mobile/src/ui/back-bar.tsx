import { colors, fontFamilies, Heading, LineIcon, spacing } from "@pilates/mobile-core";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Polyline } from "react-native-svg";

/**
 * A pushed v2 screen's top (S03, S05–S14, S21…): a 44 pt back chevron with
 * where it returns to, then the Lora title and an optional quiet line under it.
 * `trailing` sits at the end of the bar, such as S06's «Más opciones».
 */
export function BackBar({
  back,
  onBack,
  subtitle,
  title,
  titleSize = 30,
  trailing,
}: {
  back: string;
  onBack: () => void;
  subtitle?: string;
  title?: string;
  titleSize?: 24 | 30;
  trailing?: ReactNode;
}) {
  return (
    <View style={styles.block}>
      <View style={styles.bar}>
        <Pressable
          accessibilityLabel="Volver"
          accessibilityRole="button"
          onPress={onBack}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          testID="back-bar"
        >
          <LineIcon color={colors.text} size={22} strokeWidth={1.5}>
            <Polyline points="14.5,5 7.5,12 14.5,19" />
          </LineIcon>
          <Text style={styles.backLabel}>{back}</Text>
        </Pressable>
        {trailing}
      </View>
      {title === undefined ? null : (
        <View style={styles.titles}>
          <Heading
            accessibilityLabel={title}
            accessibilityRole="header"
            style={titleSize === 24 ? styles.smallTitle : undefined}
          >
            {title}
          </Heading>
          {subtitle === undefined ? null : <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  back: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    marginLeft: -spacing.smLg,
    minHeight: 44,
    paddingRight: spacing.sm,
  },
  backLabel: { color: colors.text, fontFamily: fontFamilies.bodyMedium, fontSize: 16 },
  bar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  block: { gap: spacing.sm },
  pressed: { opacity: 0.6 },
  smallTitle: { fontFamily: fontFamilies.display, fontSize: 24 },
  subtitle: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: 14 },
  titles: { gap: spacing.xs },
});
