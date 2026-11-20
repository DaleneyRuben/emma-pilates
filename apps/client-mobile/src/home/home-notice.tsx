import { colors, fontFamilies, radii, spacing, surfaces, typography } from "@pilates/mobile-core";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { promotionCardMaxWidth } from "./promotion-image";

type Action = { busy?: boolean; label: string; onPress: () => void; testID: string };

/**
 * Inicio's notice on top (Rosa Emma C02c, C02d, C02g): the screen's 600 hero
 * with an uppercase eyebrow, a Lora 26 title, white lines, and at most one
 * white button or an underlined white link.
 */
export function HomeNotice({
  action,
  corner,
  eyebrow,
  lines,
  link,
  onPress,
  testID,
  title,
}: {
  action?: Action;
  /** A short fact at the top right, such as the amount. */
  corner?: string;
  eyebrow: string;
  lines: readonly string[];
  link?: Action;
  /** The whole block opens this, like its link. */
  onPress?: () => void;
  testID: string;
  title: string;
}) {
  const content = (
    <>
      <View style={styles.top}>
        <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text>
        {corner === undefined ? null : <Text style={styles.corner}>{corner}</Text>}
      </View>
      <Text style={styles.title}>{title}</Text>
      {lines.map((line) => (
        <Text key={line} style={styles.line}>
          {line}
        </Text>
      ))}
      {action === undefined ? null : (
        <Pressable
          accessibilityLabel={action.busy ? "Preparando…" : action.label}
          accessibilityRole="button"
          accessibilityState={{ busy: action.busy === true }}
          onPress={() => {
            if (action.busy !== true) action.onPress();
          }}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          testID={action.testID}
        >
          <Text style={styles.buttonLabel}>{action.busy ? "Preparando…" : action.label}</Text>
        </Pressable>
      )}
      {link === undefined ? null : (
        <Pressable
          accessibilityLabel={link.label}
          accessibilityRole="button"
          hitSlop={spacing.sm}
          onPress={link.onPress}
          style={styles.link}
          testID={link.testID}
        >
          <Text style={styles.linkLabel}>{link.label}</Text>
        </Pressable>
      )}
    </>
  );
  if (onPress === undefined) {
    return (
      <View style={[styles.block, styles.capped]} testID={testID}>
        {content}
      </View>
    );
  }
  return (
    // Screen readers reach the block's own button or link, so its text is
    // not read twice.
    <Pressable
      accessible={false}
      onPress={onPress}
      style={[styles.block, styles.capped]}
      testID={testID}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: { ...surfaces.emphasis, gap: spacing.smd, padding: spacing.xlSm },
  button: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radii.button,
    justifyContent: "center",
    marginTop: spacing.smd,
    minHeight: 48,
    paddingHorizontal: spacing.lgXl,
  },
  buttonLabel: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.body,
    fontWeight: "700",
  },
  // On a tablet it lines up with Inicio's button and plan row, from the left.
  capped: { alignSelf: "flex-start", maxWidth: promotionCardMaxWidth, width: "100%" },
  corner: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.body,
    fontWeight: "700",
  },
  eyebrow: {
    color: colors.onEmphasis,
    flexShrink: 1,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.label,
    fontWeight: "700",
    letterSpacing: typography.label * 0.14,
  },
  line: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 20,
  },
  link: { alignSelf: "flex-start", marginTop: spacing.smd, minHeight: 24 },
  linkLabel: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.body,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  pressed: { opacity: 0.85 },
  title: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.display,
    fontSize: 26,
    lineHeight: 29,
  },
  top: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
});
