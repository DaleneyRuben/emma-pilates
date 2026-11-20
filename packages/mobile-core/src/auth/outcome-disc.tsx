import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { Circle, Line, Path, Polyline, Rect } from "react-native-svg";

import { LineIcon } from "../ui/line-icon";
import type { OutcomeBadgeProps } from "../ui/outcome-badge";
import { colors, rosa } from "../ui/tokens";

const icons: Record<OutcomeBadgeProps["icon"], ReactElement> = {
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
};

/** What went well or is on its way: the check and the envelope. */
const filled = new Set<OutcomeBadgeProps["icon"]>(["check", "mail"]);

/**
 * A confirmation's 72 pt disc (Rosa Emma). On the client band (C01c, C21b,
 * C21c): a done or sent outcome is a solid 600 disc with a white glyph, a
 * dead link a white disc with a 600 glyph. Inside the staff card (E-A05–A10)
 * every outcome sits on a 50 disc with its 1 pt 200 rule.
 */
export function OutcomeDisc({ icon, surface }: OutcomeBadgeProps & { surface: "band" | "card" }) {
  const solid = surface === "band" && filled.has(icon);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.disc, solid ? styles.solid : surface === "band" ? styles.white : styles.soft]}
      testID="outcome-badge"
    >
      <LineIcon
        color={solid ? colors.onEmphasis : colors.text}
        size={32}
        strokeWidth={1.6}
        testID={`outcome-icon-${icon}`}
      >
        {icons[icon]}
      </LineIcon>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    alignItems: "center",
    alignSelf: "center",
    borderRadius: 36,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  soft: { backgroundColor: rosa[50], borderColor: rosa[200], borderWidth: 1 },
  solid: { backgroundColor: colors.emphasis },
  white: { backgroundColor: colors.card },
});
