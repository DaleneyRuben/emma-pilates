import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

// 02's tab bar line icons; React Navigation passes the focused or idle tint.
const shapes = {
  home: <Path d="M3.5 10.5 12 4l8.5 6.5V20H3.5z" />,
  booking: (
    <>
      <Rect height="15" rx="2.5" width="17" x="3.5" y="5.5" />
      <Line x1="3.5" x2="20.5" y1="10" y2="10" />
      <Line x1="8" x2="8" y1="3.5" y2="7" />
      <Line x1="16" x2="16" y1="3.5" y2="7" />
    </>
  ),
  bookings: (
    <>
      <Circle cx="12" cy="12" r="8.5" />
      <Path d="M12 7.5V12l3.5 2" />
    </>
  ),
  profile: (
    <>
      <Circle cx="12" cy="8" r="4" />
      <Path d="M4.5 20c1.4-3.4 4.2-5 7.5-5s6.1 1.6 7.5 5" />
    </>
  ),
} as const;

export type ClientTabIconName = keyof typeof shapes;

export function ClientTabIcon({ color, name }: { color: string; name: ClientTabIconName }) {
  return (
    <Svg
      accessibilityElementsHidden
      fill="none"
      height={23}
      importantForAccessibility="no-hide-descendants"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.3}
      testID={`client-tab-icon-${name}`}
      viewBox="0 0 24 24"
      width={23}
    >
      {shapes[name]}
    </Svg>
  );
}
