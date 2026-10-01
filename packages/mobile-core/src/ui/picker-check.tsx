import { View } from "react-native";
import { Polyline } from "react-native-svg";

import { LineIcon } from "./line-icon";
import { colors } from "./tokens";

/**
 * The selected row's check in a picker sheet (follow-up 74): Palo de rosa,
 * with an empty slot of the same width on the other rows.
 */
export function PickerCheck({ selected, testID }: { selected: boolean; testID?: string }) {
  if (!selected) return <View style={{ height: 20, width: 20 }} />;

  return (
    <LineIcon color={colors.primary} size={20} strokeWidth={1.4} testID={testID}>
      <Polyline points="4.5,12.5 9.5,17.5 19.5,7" />
    </LineIcon>
  );
}
