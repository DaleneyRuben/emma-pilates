import type { PropsWithChildren } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Svg from "react-native-svg";

/** A decorative outline icon on the export's 24-unit grid, hidden from screen readers. */
export function LineIcon({
  children,
  color,
  size,
  strokeWidth,
  style,
  testID,
}: PropsWithChildren<{
  color: string;
  size: number;
  strokeWidth: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}>) {
  return (
    <Svg
      accessibilityElementsHidden
      fill="none"
      height={size}
      importantForAccessibility="no-hide-descendants"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      style={style}
      testID={testID}
      viewBox="0 0 24 24"
      width={size}
    >
      {children}
    </Svg>
  );
}
