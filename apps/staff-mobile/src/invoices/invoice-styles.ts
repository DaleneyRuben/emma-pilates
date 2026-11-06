import { colors, fontFamilies, spacing, typography } from "@pilates/mobile-core";
import { StyleSheet } from "react-native";

export const invoiceStyles = StyleSheet.create({
  actions: { gap: spacing.xs, paddingTop: spacing.md },
  amount: {
    color: colors.white,
    fontFamily: fontFamilies.display,
    fontSize: 32,
    fontVariant: ["tabular-nums"],
  },
  content: { gap: spacing.xl, paddingBottom: spacing.xl },
  note: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
    textAlign: "center",
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  screen: { paddingHorizontal: spacing.xlSm },
  section: { gap: spacing.sm },
  toast: { bottom: spacing.xl * 4, left: 0, position: "absolute", right: 0 },
});
