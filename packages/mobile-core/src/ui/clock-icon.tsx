import { Circle, Path } from "react-native-svg";

import { LineIcon } from "./line-icon";
import { colors } from "./tokens";

/** The clock that opens a neutral server wait, such as «Demasiadas solicitudes…». */
export function ClockIcon({ testID }: { testID?: string }) {
  return (
    <LineIcon
      color={colors.primary}
      size={18}
      strokeWidth={1.4}
      style={{ marginTop: 1 }}
      testID={testID}
    >
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7.5V12l3 2" />
    </LineIcon>
  );
}
