import { Text, View } from "react-native";

/** A one-line warning on Lino (follow-up 225 §7). */
export function NoticeRow({ message, testID }: { message: string; testID?: string }) {
  return (
    <View testID={testID}>
      <Text>{message}</Text>
    </View>
  );
}
