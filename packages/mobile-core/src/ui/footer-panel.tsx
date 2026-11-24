import { useContext, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import { tabletPageMargin, useWideScreen } from "./tablet-layout";
import { colors, shadows, spacing } from "./tokens";

/**
 * A form's fixed footer (Rosa Emma, boards C01b, C21, C23, C25): a white
 * panel cast upward that reaches the screen's sides and its bottom edge, with
 * the button and its line inside. The `Screen` leaves its bottom to the
 * panel: give it `edges={footerEdges}` and `footerScreen`.
 */
export function FooterPanel({ children, testID }: { children: ReactNode; testID?: string }) {
  // The recovery screen can stand above the app's safe area provider.
  const bottom = useContext(SafeAreaInsetsContext)?.bottom ?? 0;
  // A tablet page's 40 pt margins: the panel still reaches the sides.
  const wide = useWideScreen();
  return (
    <View
      style={[styles.panel, wide && styles.wide, { paddingBottom: spacing.mdLg + bottom }]}
      testID={testID}
    >
      {children}
    </View>
  );
}

/** A screen whose bottom belongs to its `FooterPanel`. */
export const footerEdges = ["top", "left", "right"] as const;

const styles = StyleSheet.create({
  panel: {
    ...shadows.footer,
    backgroundColor: colors.card,
    gap: spacing.sm,
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.xlSm,
    paddingTop: spacing.mdLg,
  },
  wide: { marginHorizontal: -tabletPageMargin, paddingHorizontal: tabletPageMargin },
});

/** The `Screen` style that hands its bottom padding to the panel. */
export const footerScreen = StyleSheet.create({ screen: { paddingBottom: 0 } }).screen;
