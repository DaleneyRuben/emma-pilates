import { spacing } from "@pilates/mobile-core";
import { Children, type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useIsTablet } from "../ui/use-is-tablet";

// Tablet keeps forms and single-item screens in a width-constrained, centered
// card instead of stretching them edge to edge.
export function CenteredCard({
  children,
  maxWidth,
  style,
}: {
  children: ReactNode;
  maxWidth: number;
  style?: StyleProp<ViewStyle>;
}) {
  const tablet = useIsTablet();
  return (
    <View
      style={[styles.column, tablet && { maxWidth }, style]}
      testID="assistant-centered-card"
    >
      {children}
    </View>
  );
}

// A single column on phones and a two-column grid of cards on tablets.
export function TabletGrid({
  children,
  testID,
}: {
  children: ReactNode;
  testID: string;
}) {
  const tablet = useIsTablet();
  return (
    <View style={[styles.list, tablet && styles.grid]} testID={testID}>
      {tablet
        ? Children.map(children, (child) => <View style={styles.gridItem}>{child}</View>)
        : children}
    </View>
  );
}

const styles = StyleSheet.create({
  column: { alignSelf: "center", flex: 1, gap: spacing.md, width: "100%" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  gridItem: { flexBasis: "48%", flexGrow: 0 },
  list: { gap: spacing.md },
});
