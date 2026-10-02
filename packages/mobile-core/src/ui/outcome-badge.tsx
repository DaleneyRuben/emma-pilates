import { View } from "react-native";
import { Circle, Line, Path, Polyline, Rect } from "react-native-svg";

import { LineIcon } from "./line-icon";
import { colors } from "./tokens";

const icons = {
  at: (
    <>
      <Circle cx={12} cy={12} r={3.5} />
      <Path d="M15.5 12v1.5a2.5 2.5 0 0 0 5 0V12a8.5 8.5 0 1 0-3.3 6.7" />
    </>
  ),
  blocked: (
    <>
      <Circle cx={12} cy={12} r={9} />
      <Line x1={5.8} x2={18.2} y1={18.2} y2={5.8} />
    </>
  ),
  check: <Polyline points="5,12.5 10,17.5 19,7.5" />,
  clock: (
    <>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7.5V12l3 2" />
    </>
  ),
  mail: (
    <>
      <Rect height={12} rx={2} width={17} x={3.5} y={6} />
      <Polyline points="4,7 12,13 20,7" />
    </>
  ),
} as const;

export type OutcomeBadgeProps = {
  icon: keyof typeof icons;
  tone: "primary" | "success";
};

/** The 76 pt circle over a confirmation's title: sage for success, Palo de rosa otherwise. */
export function OutcomeBadge({ icon, tone }: OutcomeBadgeProps) {
  const success = tone === "success";
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        alignItems: "center",
        alignSelf: "center",
        backgroundColor: success ? colors.successTint : colors.primaryWash,
        borderRadius: 38,
        height: 76,
        justifyContent: "center",
        width: 76,
      }}
      testID="outcome-badge"
    >
      <LineIcon
        color={success ? colors.success : colors.primary}
        size={34}
        strokeWidth={1.2}
        testID={`outcome-icon-${icon}`}
      >
        {icons[icon]}
      </LineIcon>
    </View>
  );
}
