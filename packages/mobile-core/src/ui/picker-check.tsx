import { View } from "react-native";
import Svg, { Polyline } from "react-native-svg";

import { colors } from "./tokens";

/**
 * The selected row's check in a picker sheet (follow-up 74): Palo de rosa,
 * with an empty slot of the same width on the other rows.
 */
export function PickerCheck({ selected, testID }: { selected: boolean; testID?: string }) {
  if (!selected) return <View style={{ height: 20, width: 20 }} />;

  return (
    <Svg
      accessibilityElementsHidden
      fill="none"
      height={20}
      importantForAccessibility="no-hide-descendants"
      stroke={colors.primary}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.4}
      testID={testID}
      viewBox="0 0 24 24"
      width={20}
    >
      <Polyline points="4.5,12.5 9.5,17.5 19.5,7" />
    </Svg>
  );
}
