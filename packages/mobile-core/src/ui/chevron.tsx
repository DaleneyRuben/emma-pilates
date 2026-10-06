import { Polyline } from "react-native-svg";

import { LineIcon } from "./line-icon";
import { colors } from "./tokens";

const points = {
  down: "6,9.5 12,15.5 18,9.5",
  right: "9.5,5 16.5,12 9.5,19",
  up: "6,14.5 12,8.5 18,14.5",
} as const;

const tones = {
  // Texto tenue: the «Sucursal:» picker of 03, S07, and S13.
  muted: colors.textMuted,
  // Palo de rosa: every tappable card and list row (02, 16, S16…).
  primary: colors.primary,
  // Icono tenue: the Perfil menu rows of 18 and S23.
  quiet: colors.iconQuiet,
} as const;

/** The frames' row chevron (MOB-041): 19 pt, stroke 1.3, hidden from screen readers. */
export function Chevron({
  direction = "right",
  size = 19,
  testID = "chevron",
  tone = "primary",
}: {
  direction?: keyof typeof points;
  size?: number;
  testID?: string;
  tone?: keyof typeof tones;
}) {
  return (
    <LineIcon color={tones[tone]} size={size} strokeWidth={1.3} testID={testID}>
      <Polyline points={points[direction]} testID={`${testID}-${direction}`} />
    </LineIcon>
  );
}
