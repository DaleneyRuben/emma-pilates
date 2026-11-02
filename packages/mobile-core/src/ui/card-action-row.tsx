import { View } from "react-native";

export type CardActionRowProps = {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  testID?: string;
  tone?: "default" | "error";
};

export const cardWithActionRow = {};

/** A card's action row (follow-up 226). */
export function CardActionRow({ testID }: CardActionRowProps) {
  return <View testID={testID} />;
}
