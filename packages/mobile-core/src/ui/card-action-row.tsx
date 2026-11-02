import { StyleSheet, View } from "react-native";

import { TextButton } from "./text-button";
import { colors, spacing } from "./tokens";

export type CardActionRowProps = {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  testID?: string;
  /** «error» for «Cancelar reserva»; Rosa enlace otherwise («Reprogramar»). */
  tone?: "default" | "error";
};

/** Spread into a card that ends in a `CardActionRow`: the button's height gives the space. */
export const cardWithActionRow = { paddingBottom: spacing.xs } as const;

/**
 * A card's action (follow-up 226 §1): an Arena hairline, then a right-aligned
 * text button, 44 tall with 12 side padding, no fill and no border.
 */
export function CardActionRow({ disabled, label, onPress, testID, tone }: CardActionRowProps) {
  return (
    <View style={styles.row}>
      <TextButton
        disabled={disabled}
        label={label}
        onPress={onPress}
        style={styles.button}
        testID={testID}
        tone={tone}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  button: { paddingHorizontal: spacing.md },
  row: {
    borderTopColor: colors.hairline,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
});
