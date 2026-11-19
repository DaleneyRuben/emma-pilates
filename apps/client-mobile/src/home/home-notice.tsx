import { colors, fontFamilies, radii, spacing, surfaces, typography } from "@pilates/mobile-core";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { promotionCardMaxWidth } from "./promotion-image";

type Action = { busy?: boolean; label: string; onPress: () => void; testID: string };

/**
 * Inicio's notice on top (C1 C and C8 A + C, owner 2026-11-19): one Palo de
 * rosa block with an uppercase eyebrow, a Lora title, Crema lines, and at
 * most one Crema button or a quiet Crema link.
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
    backgroundColor: colors.onEmphasis,
    borderRadius: radii.button,
    justifyContent: "center",
    marginTop: spacing.xs,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  buttonLabel: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.body,
    fontWeight: "700",
  },
  capped: { alignSelf: "center", maxWidth: promotionCardMaxWidth, width: "100%" },
  corner: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.note,
    fontWeight: "700",
  },
  eyebrow: {
    color: colors.onEmphasis,
    flexShrink: 1,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.label,
    fontWeight: "700",
  },
  line: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  link: { alignSelf: "flex-start", minHeight: 24 },
  linkLabel: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  pressed: { opacity: 0.85 },
  title: { color: colors.onEmphasis, fontFamily: fontFamilies.display, fontSize: 26 },
  top: { flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
});
