import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";

import { colors, spacing } from "./tokens";

/** A card's last row under a Regla rule (MOB-042): 03, S02, S07, S11, S13. */
export function CardFooter({
  children,
  paddingTop = spacing.md,
  testID = "card-footer",
}: PropsWithChildren<{ paddingTop?: number; testID?: string }>) {
  return (
    <View style={[styles.footer, { paddingTop }]} testID={testID}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    alignItems: "center",
    borderTopColor: colors.rule,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
});
