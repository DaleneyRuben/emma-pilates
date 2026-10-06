import { StyleSheet } from "react-native";
import {
  SafeAreaView,
  type SafeAreaViewProps,
} from "react-native-safe-area-context";

import { colors, spacing } from "./tokens";

export function Screen({ style, ...props }: SafeAreaViewProps) {
  return <SafeAreaView {...props} style={[styles.screen, style]} />;
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.surface,
    flex: 1,
    padding: spacing.lg,
  },
});
