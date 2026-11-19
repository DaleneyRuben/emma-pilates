import { fontFamilies } from "@pilates/mobile-core";
import { StyleSheet, Text } from "react-native";

/**
 * A tab's label (FIX-089): Work Sans 12 in Rosa profundo; the open tab is told
 * apart by weight, never by another colour.
 */
export function TabLabel({
  color,
  focused,
  title,
}: {
  color: string;
  focused: boolean;
  title: string;
}) {
  return <Text style={[styles.label, { color }, focused && styles.focused]}>{title}</Text>;
}

const styles = StyleSheet.create({
  focused: { fontFamily: fontFamilies.bodyStrong, fontWeight: "600" },
  label: { fontFamily: fontFamilies.bodyMedium, fontSize: 12, fontWeight: "500" },
});
