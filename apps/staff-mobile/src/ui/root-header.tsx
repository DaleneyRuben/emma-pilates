import { Heading, spacing } from "@pilates/mobile-core";
import { StyleSheet, View } from "react-native";

import { AccountAvatar } from "../profile/account-avatar";

// Every role root carries the account avatar: it is the only route to Perfil.
export function RootHeader({ label, title }: { label: string; title: string }) {
  return (
    <View style={styles.rootHeader}>
      <Heading accessibilityLabel={label} style={styles.rootTitle}>
        {title}
      </Heading>
      <AccountAvatar />
    </View>
  );
}

const styles = StyleSheet.create({
  rootHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.smLg,
    justifyContent: "space-between",
  },
  rootTitle: { flex: 1 },
});
