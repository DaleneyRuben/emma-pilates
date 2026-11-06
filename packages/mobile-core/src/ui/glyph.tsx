import type { StyleProp, ViewStyle } from "react-native";
import { Circle, Line, Path, Polyline, Rect } from "react-native-svg";

import { LineIcon } from "./line-icon";
import { colors } from "./tokens";

// The frames' small line icons on their 24-unit grid (follow-up 70, MOB-039,
// MOB-041, MOB-042): one shape per name, drawn by `Glyph`.
export const glyphShapes = {
  // The v2 notice row's warning (follow-up 225 §7).
  alert: (
    <>
      <Circle cx={12} cy={12} r={8.5} />
      <Path d="M12 8v5M12 16.5v.5" />
    </>
  ),
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
  // S10 QR receipt card (design follow-up 254 § 2).
  camera: (
    <>
      <Path d="M4 8h3.5l1.5-2.5h6L16.5 8H20v11H4z" />
      <Circle cx={12} cy={13} r={3.5} />
    </>
  ),
  card: (
    <>
      <Rect height={15} rx={2.5} width={17} x={3.5} y={5.5} />
      <Line x1={3.5} x2={20.5} y1={10} y2={10} />
    </>
  ),
  // 11's confirmed payment (follow-up 111), the check the icon row draws.
  check: <Polyline points="4.5,12.5 9.5,17.5 19.5,7" />,
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
  // 11's rejected payment (follow-up 111).
  cross: (
    <>
      <Line x1={6.5} x2={17.5} y1={6.5} y2={17.5} />
      <Line x1={17.5} x2={6.5} y1={6.5} y2={17.5} />
    </>
  ),
  // Follow-up 92's password eye (MOB-059): open while the field is hidden.
  eye: (
    <>
      <Path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <Circle cx={12} cy={12} r={3} />
    </>
  ),
  eyeOff: (
    <>
      <Path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <Circle cx={12} cy={12} r={3} />
      <Line x1={4} x2={20} y1={4} y2={20} />
    </>
  ),
  // 11's pending payment (follow-up 111): two triangles and a lower fill.
  hourglass: (
    <>
      <Path d="M7 4.5h10M7 19.5h10M8 4.5l4 6.2 4-6.2M8 19.5l4-6.2 4 6.2" />
      <Line x1={10.2} x2={13.8} y1={16.8} y2={16.8} />
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
  // «Enviar comentarios» on 18 (REL-012): a speech bubble.
  message: (
    <Path d="M6.5 5h11a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-6l-4.5 3.5v-3.5h-.5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
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
  // The client v2 boards (follow-up 227).
  copy: (
    <>
      <Rect height={12} rx={2} width={12} x={8} y={8} />
      <Path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" />
    </>
  ),
  document: (
    <>
      <Rect height={17} rx={2} width={14} x={5} y={3.5} />
      <Path d="M9 8h6M9 12h6M9 16h3" />
    </>
  ),
  flame: (
    <Path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 1.5 1 2.5 2 3 0-3.5.5-6 1-8.5z" />
  ),
  health: (
    <>
      <Path d="M12 21c-4-2.5-7-6-7-10a7 7 0 0 1 14 0c0 4-3 7.5-7 10z" />
      <Path d="M12 8v6M9 11h6" />
    </>
  ),
  image: (
    <>
      <Rect height={16} rx={2} width={16} x={4} y={4} />
      <Circle cx={9} cy={9.5} r={1.5} />
      <Path d="M20 15l-4.5-4.5L6 20" />
    </>
  ),
  logout: (
    <Path d="M14 4.5H6.5a1.5 1.5 0 0 0-1.5 1.5v12a1.5 1.5 0 0 0 1.5 1.5H14M10 12h10M16.5 8.5L20 12l-3.5 3.5" />
  ),
  mail: (
    <>
      <Rect height={13} rx={2.5} width={18} x={3} y={5.5} />
      <Path d="M3.5 7l8.5 6 8.5-6" />
    </>
  ),
  personAdd: (
    <>
      <Circle cx={9} cy={8} r={3.5} />
      <Path d="M3 20c.8-3.5 3.2-5.5 6-5.5s5.2 2 6 5.5M18 8v6M15 11h6" />
    </>
  ),
  phone: (
    <>
      <Rect height={18} rx={2.5} width={11} x={6.5} y={3} />
      <Path d="M11 17.5h2" />
    </>
  ),
  receipt: (
    <>
      <Path d="M6 3.5h12v17l-3-2-3 2-3-2-3 2z" />
      <Path d="M9 8h6M9 12h6" />
    </>
  ),
  refresh: (
    <Path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.7 5.6L4 15.5M4 20v-4.5h4.5" />
  ),
  share: (
    <Path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13" />
  ),
  sun: (
    <>
      <Path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <Circle cx={12} cy={12} r={4} />
    </>
  ),
  tag: (
    <>
      <Path d="M3.5 12.5V4.5a1 1 0 0 1 1-1h8l8 8-9 9z" />
      <Circle cx={8.5} cy={8.5} r={1.5} />
    </>
  ),
  undo: <Path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4" />,
  upload: (
    <Path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M4.5 15v3.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V15" />
  ),
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
