import { colors, fontFamilies, spacing, typography } from "@pilates/mobile-core";
import { StyleSheet } from "react-native";

const onHero = { color: colors.onEmphasis } as const;

export const invoiceStyles = StyleSheet.create({
  amount: {
    ...onHero,
    fontFamily: fontFamilies.display,
    fontSize: 36,
    fontVariant: ["tabular-nums"],
    lineHeight: 42,
  },
  // E-D19: «MONTO» and the payment's state share the hero's first line.
  heroLabel: {
    ...onHero,
    flex: 1,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.label,
    fontWeight: "700",
    letterSpacing: typography.label * 0.14,
    textTransform: "uppercase",
  },
  heroNote: { ...onHero, fontFamily: fontFamilies.body, fontSize: typography.body },
  heroTop: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  note: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
    textAlign: "center",
  },
  row: { flexDirection: "row", justifyContent: "space-around" },
  screen: { paddingHorizontal: spacing.xlSm },
  // FIX-089: the state is a word in weight on the hero, not a pill.
  state: {
    ...onHero,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.body,
    fontWeight: "700",
  },
  toast: { bottom: spacing.xl * 4, left: 0, position: "absolute", right: 0 },
});
