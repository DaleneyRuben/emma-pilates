import { colors } from "@pilates/mobile-core";
import Svg, { Circle, Line, Path, Polyline, Rect } from "react-native-svg";

// 18's line icons for the Perfil rows, stroked in Palo de rosa (follow-up 70).
const shapes = {
  plan: (
    <>
      <Circle cx="12" cy="12" r="8.5" />
      <Path d="M12 7.5V12l3.5 2" />
    </>
  ),
  evaluation: (
    <>
      <Path d="M5.5 18.5c0-7.5 5-12.5 13-13.5-.6 8.3-5.6 13.5-13 13.5z" />
      <Path d="M5.5 18.5l6.5-6.5" />
    </>
  ),
  evaluations: <Polyline points="4,16 9,10.5 13,14 20,6.5" />,
  referrals: (
    <>
      <Circle cx="12" cy="8" r="4" />
      <Path d="M4.5 20c1.4-3.4 4.2-5 7.5-5s6.1 1.6 7.5 5" />
    </>
  ),
  credit: (
    <>
      <Rect height="12" rx="2.5" width="17" x="3.5" y="6.5" />
      <Line x1="3.5" x2="20.5" y1="11" y2="11" />
    </>
  ),
  notifications: (
    <>
      <Path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10z" />
      <Path d="M10.5 18.5a2 2 0 0 0 3 0" />
    </>
  ),
  password: (
    <>
      <Rect height="10.5" rx="2.5" width="16" x="4" y="10" />
      <Path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
    </>
  ),
} as const;

export type ProfileRowIconName = keyof typeof shapes;

export function ProfileRowIcon({ name }: { name: ProfileRowIconName }) {
  return (
    <Svg
      accessibilityElementsHidden
      fill="none"
      height={21}
      importantForAccessibility="no-hide-descendants"
      stroke={colors.primary}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.3}
      testID={`profile-row-icon-${name}`}
      viewBox="0 0 24 24"
      width={21}
    >
      {shapes[name]}
    </Svg>
  );
}
