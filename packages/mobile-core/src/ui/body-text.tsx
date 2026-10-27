import { Text, type TextProps } from "react-native";

import { fontFamilies } from "./fonts";
import { colors, typography } from "./tokens";

export function BodyText({ style, ...props }: TextProps) {
  return (
    <Text
      {...props}
      style={[
        {
          color: colors.textSecondary,
          fontFamily: fontFamilies.body,
          fontSize: typography.body,
        },
        style,
      ]}
    />
  );
}
