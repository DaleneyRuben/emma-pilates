import type { TextLayoutStyle } from "./text";
import { Text } from "./text";
import type { StyleProp } from "react-native";

/** A sheet's or a dialog's title (follow-up 285): `titulo-seccion`, a header. */
export function SheetTitle({
  children,
  style,
  testID,
}: {
  children: string;
  style?: StyleProp<TextLayoutStyle>;
  testID?: string;
}) {
  return (
    <Text accessibilityRole="header" style={style} testID={testID} variant="titulo-seccion">
      {children}
    </Text>
  );
}
