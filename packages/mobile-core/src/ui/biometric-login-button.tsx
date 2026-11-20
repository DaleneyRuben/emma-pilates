import { Platform, Pressable, StyleSheet } from "react-native";

import { BodyText } from "./body-text";
import { fontFamilies } from "./fonts";
import { colors, radii, spacing, typography } from "./tokens";

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

// Rosa Emma C01f: an outlined secondary button, white with a 1.5 pt 600 rule.
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
  label: {
    color: colors.primaryDeep,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.body,
    fontWeight: "700",
  },
});
