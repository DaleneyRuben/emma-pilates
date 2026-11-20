import { Platform, Pressable, StyleSheet } from "react-native";

import { Text } from "./text";
import { colors, radii, spacing } from "./tokens";

type BiometricLoginButtonProps = {
  onPress: () => void;
};

export function BiometricLoginButton({ onPress }: BiometricLoginButtonProps) {
  const label =
    Platform.OS === "ios" ? "Iniciar sesión con Face ID" : "Iniciar sesión con huella digital";

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.button}
    >
      <Text variant="boton">{label}</Text>
    </Pressable>
  );
}

// Rosa Emma C01f: an outlined secondary button, white with a 1.5 pt 600 rule,
// its label in `boton` (follow-up 285).
const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.primary,
    borderRadius: radii.button,
    borderWidth: 1.5,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
});
