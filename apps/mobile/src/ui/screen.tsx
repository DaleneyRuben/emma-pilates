import { StyleSheet, View, type ViewProps } from "react-native";

import { colors, spacing } from "./tokens";

export function Screen({ style, ...props }: ViewProps) {
  return <View {...props} style={[styles.screen, style]} />;
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
    padding: spacing.lg,
  },
});
