import { Text, type TextProps } from "react-native";

import { fontFamilies } from "./fonts";
import { colors, typography } from "./tokens";

export function Heading({ style, ...props }: TextProps) {
  return (
    <Text
      {...props}
      style={[
        {
          color: colors.text,
          fontFamily: fontFamilies.heading,
          fontSize: typography.title,
          fontWeight: "500",
        },
        style,
      ]}
    />
  );
}
