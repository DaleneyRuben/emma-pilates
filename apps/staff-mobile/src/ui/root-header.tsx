import { colors, Heading, spacing, typography } from "@pilates/mobile-core";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AccountAvatar } from "../profile/account-avatar";

// Every role root carries the account avatar: it is the only route to Perfil.
// A role action (e.g. "Mi disponibilidad") sits to its left.
export function RootHeader({
  action,
  eyebrow,
  label,
  title,
}: {
  action?: ReactNode;
  eyebrow?: string;
  label: string;
  title: string;
}) {
  return (
    <View style={styles.rootHeader}>
      <View style={styles.rootTitle}>
        {eyebrow === undefined ? null : <Text style={styles.eyebrow}>{eyebrow}</Text>}
        <Heading accessibilityLabel={label}>{title}</Heading>
      </View>
      {action}
      <AccountAvatar />
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    color: colors.textMuted,
    fontSize: typography.label,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  rootHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.smLg,
    justifyContent: "space-between",
  },
  rootTitle: { flex: 1 },
});
