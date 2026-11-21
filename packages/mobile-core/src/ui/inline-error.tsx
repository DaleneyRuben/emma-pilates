import type { StyleProp } from "react-native";

import { Text, type TextLayoutStyle } from "./text";

/**
 * A request's error inside a card or a sheet (follow-up 285): a sentence in
 * `cuerpo`, never in Lora, announced as an alert. A field's own error is
 * `secundario`, under the field: pass `field`. It always stands on white or
 * 50, never straight on the 100 screen (rule 3).
 */
export function InlineError({
  children,
  field = false,
  style,
  testID,
}: {
  children: string;
  field?: boolean;
  style?: StyleProp<TextLayoutStyle>;
  testID?: string;
}) {
  return (
    <Text
      accessibilityRole="alert"
      style={style}
      testID={testID}
      variant={field ? "secundario" : "cuerpo"}
    >
      {children}
    </Text>
  );
}
