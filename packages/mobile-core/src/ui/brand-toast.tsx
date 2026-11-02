import { Text, View } from "react-native";

export type BrandToastProps = {
  note?: string;
  onClose: () => void;
  testID?: string;
  title: string;
};

/** The confirmation toast (follow-up 225 §7). */
export function BrandToast({ testID, title }: BrandToastProps) {
  return (
    <View testID={testID}>
      <Text>{title}</Text>
    </View>
  );
}

/** A notice carried in navigation params that stays until closed or blurred. */
export function useStickyNotice<T>(notice: T | undefined, dismiss: () => void): T | null {
  void dismiss;
  return notice ?? null;
}
