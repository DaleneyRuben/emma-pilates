import type { ReactNode } from "react";
import { Text, View } from "react-native";

type Action = { label: string; onPress: () => void; testID?: string };

export type EmphasisCardProps = {
  action?: Action;
  children?: ReactNode;
  eyebrow?: string;
  note?: string;
  pill?: string;
  testID?: string;
  title?: string;
};

/** The screen's one Rosa profundo card (follow-up 225 §5). */
export function EmphasisCard({ children, testID, title }: EmphasisCardProps) {
  return (
    <View testID={testID}>
      {title === undefined ? null : <Text>{title}</Text>}
      {children}
    </View>
  );
}

/** The white pill action on an emphasis card (follow-up 225 §4). */
export function OnEmphasisButton({ label }: Action) {
  return <Text>{label}</Text>;
}
