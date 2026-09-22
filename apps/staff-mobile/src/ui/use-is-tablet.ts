import { useWindowDimensions } from "react-native";

// Width from which the Staff app switches to its tablet layouts.
export const tabletMinimumWidth = 768;

export function useIsTablet(): boolean {
  const { width } = useWindowDimensions();
  return width >= tabletMinimumWidth;
}
