import { Text, View } from "react-native";

export type SegmentedTabsProps<Key extends string> = {
  accessibilityLabel?: string;
  onSelect: (key: Key) => void;
  options: readonly { key: Key; label: string; testID?: string }[];
  selected: Key;
  testID?: string;
};

/** A two- or three-way switch under a screen title (follow-up 225 §9). */
export function SegmentedTabs<Key extends string>({ options, testID }: SegmentedTabsProps<Key>) {
  return (
    <View testID={testID}>
      {options.map((option) => (
        <Text key={option.key}>{option.label}</Text>
      ))}
    </View>
  );
}
