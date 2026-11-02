import type { ReactNode } from "react";
import { Text, View } from "react-native";

import type { GlyphName } from "./glyph";

export type IconRowProps = {
  chevron?: boolean;
  icon: GlyphName;
  label: string;
  onPress?: () => void;
  testID?: string;
  value?: string;
};

/** A fact as a row with an icon disc (follow-up 225 §3). */
export function IconRow({ label }: IconRowProps) {
  return <Text>{label}</Text>;
}

/** Lino rows with hairlines between them (follow-up 225 §2). */
export function IconRowGroup({ children, testID }: { children: ReactNode; testID?: string }) {
  return <View testID={testID}>{children}</View>;
}
