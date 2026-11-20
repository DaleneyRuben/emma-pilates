import { fontFamilies } from "@pilates/mobile-core";
import { StyleSheet, Text } from "react-native";

/**
 * A tab's label (Rosa Emma): Work Sans 12 in rosa profundo, white and bold on
 * the open tab's 600 pill.
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
  // Five tabs leave about 70 pt each: a long label («Disponibilidad», «Para
  // contactar») shrinks a little instead of breaking onto two lines.
  return (
    <Text
      adjustsFontSizeToFit
      minimumFontScale={0.8}
      numberOfLines={1}
      style={[styles.label, { color }, focused && styles.focused]}
    >
      {title}
    </Text>
  );
}

const styles = StyleSheet.create({
  focused: { fontFamily: fontFamilies.bodyBold, fontWeight: "700" },
  label: { fontFamily: fontFamilies.bodyMedium, fontSize: 12, fontWeight: "500" },
});
