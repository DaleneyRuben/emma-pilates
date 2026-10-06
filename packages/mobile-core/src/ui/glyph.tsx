import type { StyleProp, ViewStyle } from "react-native";
import { Circle, Line, Path, Polyline, Rect } from "react-native-svg";

import { LineIcon } from "./line-icon";
import { colors } from "./tokens";

// The frames' small line icons on their 24-unit grid (follow-up 70, MOB-039,
// MOB-041, MOB-042): one shape per name, drawn by `Glyph`.
export const glyphShapes = {
  bell: (
    <>
      <Path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10z" />
      <Path d="M10.5 18.5a2 2 0 0 0 3 0" />
    </>
  ),
  calendar: (
    <>
      <Rect height={15} rx={2.5} width={17} x={3.5} y={5.5} />
      <Line x1={3.5} x2={20.5} y1={10} y2={10} />
      <Line x1={8} x2={8} y1={3.5} y2={7} />
      <Line x1={16} x2={16} y1={3.5} y2={7} />
    </>
  ),
  card: (
    <>
      <Rect height={15} rx={2.5} width={17} x={3.5} y={5.5} />
      <Line x1={3.5} x2={20.5} y1={10} y2={10} />
    </>
  ),
  clock: (
    <>
      <Circle cx={12} cy={12} r={8.5} />
      <Path d="M12 7.5V12l3.5 2" />
    </>
  ),
  credit: (
    <>
      <Rect height={12} rx={2.5} width={17} x={3.5} y={6.5} />
      <Line x1={3.5} x2={20.5} y1={11} y2={11} />
    </>
  ),
  leaf: (
    <>
      <Path d="M5.5 18.5c0-7.5 5-12.5 13-13.5-.6 8.3-5.6 13.5-13 13.5z" />
      <Path d="M5.5 18.5l6.5-6.5" />
    </>
  ),
  // 02's disabled shortcut (MOB-041).
  lock: (
    <>
      <Rect height={9.5} rx={2.5} width={14} x={5} y={10.5} />
      <Path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </>
  ),
  // 18's «Cambiar contraseña» row.
  password: (
    <>
      <Rect height={10.5} rx={2.5} width={16} x={4} y={10} />
      <Path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
    </>
  ),
  person: (
    <>
      <Circle cx={12} cy={8} r={4} />
      <Path d="M4.5 20c1.4-3.4 4.2-5 7.5-5s6.1 1.6 7.5 5" />
    </>
  ),
  pin: (
    <>
      <Circle cx={12} cy={10} r={3} />
      <Path d="M12 21c4.5-4.7 6.5-7.7 6.5-10.6A6.5 6.5 0 0 0 5.5 10.4C5.5 13.3 7.5 16.3 12 21z" />
    </>
  ),
  trend: <Polyline points="4,16 9,10.5 13,14 20,6.5" />,
} as const;

export type GlyphName = keyof typeof glyphShapes;

/** One of the frames' line icons, Palo de rosa at stroke 1.3 unless told otherwise. */
export function Glyph({
  color = colors.primary,
  name,
  size,
  strokeWidth = 1.3,
  style,
  testID = `glyph-${name}`,
}: {
  color?: string;
  name: GlyphName;
  size: number;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <LineIcon color={color} size={size} strokeWidth={strokeWidth} style={style} testID={testID}>
      {glyphShapes[name]}
    </LineIcon>
  );
}
