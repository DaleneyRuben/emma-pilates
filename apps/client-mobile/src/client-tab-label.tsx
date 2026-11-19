import { fontFamilies, typography } from "@pilates/mobile-core";
import { StyleSheet, Text } from "react-native";

/**
 * A tab's label (FIX-089): Work Sans in the tab's tint, the open tab in
 * weight rather than in another colour, never under 12 pt.
 */
export function ClientTabLabel({
  children,
  color,
  focused,
}: {
  children: string;
  color: string;
  focused: boolean;
}) {
  return (
    <Text numberOfLines={1} style={[styles.label, { color }, focused && styles.focused]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  focused: { fontFamily: fontFamilies.bodyStrong, fontWeight: "600" },
  label: { fontFamily: fontFamilies.body, fontSize: typography.label },
});
