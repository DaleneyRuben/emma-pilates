import type { ReactNode } from "react";
import { Text, View } from "react-native";

import type { GlyphName } from "./glyph";

type Action = { label: string; onPress: () => void; testID?: string };

export type StateScreenProps = {
  children?: ReactNode;
  icon?: GlyphName;
  layout?: "card" | "centred" | "inList";
  note?: string;
  primaryAction?: Action;
  testID?: string;
  testIDPrefix?: string;
  textAction?: Action;
  title: string;
  tone?: "brand" | "error";
};

/** An empty, pending, success, or error state (follow-up 225 §6). */
export function StateScreen({ testID, title }: StateScreenProps) {
  return (
    <View testID={testID}>
      <Text>{title}</Text>
    </View>
  );
}
