import { Platform, Pressable, StyleSheet } from "react-native";

import { BodyText } from "./body-text";
import { colors, spacing } from "./tokens";

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
      <BodyText style={styles.label}>{label}</BodyText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  label: {
    color: colors.primaryDeep,
  },
});
