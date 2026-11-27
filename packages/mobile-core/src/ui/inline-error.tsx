import { StyleSheet, View, type StyleProp } from "react-native";

import { Glyph, type GlyphName } from "./glyph";
import { Text, type TextLayoutStyle } from "./text";
import { colors, spacing } from "./tokens";

/**
 * A request's error inside a card or a sheet (follow-up 285): a sentence in
 * `cuerpo`, never in Lora, announced as an alert. A field's own error is
 * `secundario`, under the field: pass `field`. It always stands on white or
 * 50, never straight on the 100 screen (rule 3). An `icon` leads the
 * sentence where a board draws one, such as C01b6's alert circle.
 */
export function InlineError({
  children,
  field = false,
  icon,
  style,
  testID,
}: {
  children: string;
  field?: boolean;
  icon?: GlyphName;
  style?: StyleProp<TextLayoutStyle>;
  testID?: string;
}) {
  const sentence = (
    <Text
      accessibilityRole="alert"
      style={icon === undefined ? style : [styles.sentence, style]}
      testID={testID}
      variant={field ? "secundario" : "cuerpo"}
    >
      {children}
    </Text>
  );
  if (icon === undefined) return sentence;
  return (
    <View style={styles.row}>
      <Glyph
        color={colors.text}
        name={icon}
        size={16}
        strokeWidth={1.7}
        testID={`inline-error-icon-${icon}`}
      />
      {sentence}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", gap: spacing.smd },
  sentence: { flexShrink: 1 },
});
