import Svg, { Circle, Path, Rect } from "react-native-svg";

// The v2 staff tab bar's line icons (design/v2/equipo, follow-up 225 §8).
const shapes = {
  agenda: (
    <>
      <Rect height="15" rx="2.5" width="17" x="3.5" y="5" />
      <Path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  availability: (
    <>
      <Rect height="15" rx="2.5" width="17" x="3.5" y="5" />
      <Path d="M3.5 10h17M8 3v4M16 3v4M9 15l2 2 4-4" />
    </>
  ),
  cash: <Path d="M4 10h16v9.5H4zM6.5 10V5.5h11V10M9 14.5h6" />,
  clients: (
    <>
      <Circle cx="9" cy="8" r="3.5" />
      <Path d="M3 20c.8-3.5 3.2-5.5 6-5.5s5.2 2 6 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c1.6.7 2.6 2.6 3 5.5" />
    </>
  ),
  contacts: (
    <>
      <Path d="M4.5 5.5h15v10h-9l-4.5 4v-4h-1.5z" />
      <Path d="M8.5 10.5h7" />
    </>
  ),
  pay: (
    <>
      <Rect height="13" rx="2.5" width="18" x="3" y="6" />
      <Path d="M3 10h18M16 14.5h1.5" />
    </>
  ),
  payments: (
    <>
      <Path d="M6 3.5h12v17l-3-2-3 2-3-2-3 2z" />
      <Path d="M9 8.5h6M9 12.5h6" />
    </>
  ),
  profile: (
    <>
      <Circle cx="12" cy="8.5" r="3.5" />
      <Path d="M5 20c1-3.6 3.8-5.5 7-5.5s6 1.9 7 5.5" />
    </>
  ),
  schedule: (
    <>
      <Circle cx="12" cy="12" r="8.5" />
      <Path d="M12 7.5V12l3 2" />
    </>
  ),
} as const;

export type StaffTabIconName = keyof typeof shapes;

export function StaffTabIcon({
  color,
  focused,
  name,
}: {
  color: string;
  focused: boolean;
  name: StaffTabIconName;
}) {
  return (
    <Svg
      accessibilityElementsHidden
      fill="none"
      height={22}
      importantForAccessibility="no-hide-descendants"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={focused ? 1.6 : 1.5}
      testID={`staff-tab-icon-${name}`}
      viewBox="0 0 24 24"
      width={22}
    >
      {shapes[name]}
    </Svg>
  );
}
