import { colors, spacing, typography } from "./tokens";
import { Pressable, StyleSheet, Text } from "react-native";

export function BackLink({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel="Volver"
      accessibilityRole="button"
      hitSlop={spacing.sm}
      onPress={onPress}
      style={styles.button}
    >
      <Text style={styles.label}>← Volver</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center" },
  label: { color: colors.primaryDeep, fontSize: typography.body },
});
