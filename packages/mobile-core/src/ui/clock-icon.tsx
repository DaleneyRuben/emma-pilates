import Svg, { Circle, Path } from "react-native-svg";

import { colors } from "./tokens";

/** The clock that opens a neutral server wait, such as «Demasiadas solicitudes…». */
export function ClockIcon({ testID }: { testID?: string }) {
  return (
    <Svg
      accessibilityElementsHidden
      fill="none"
      height={18}
      importantForAccessibility="no-hide-descendants"
      stroke={colors.primary}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.4}
      style={{ marginTop: 1 }}
      testID={testID}
      viewBox="0 0 24 24"
      width={18}
    >
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7.5V12l3 2" />
    </Svg>
  );
}
