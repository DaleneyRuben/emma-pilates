import { StyleSheet, View } from "react-native";

import { OutlinedButton } from "../ui/outlined-button";
import { Text } from "../ui/text";
import { colors, radii, spacing } from "../ui/tokens";

/**
 * C01e2 (walkthrough n.º 4): Login refused the address this phone registered
 * and has not confirmed, so it says so instead of «El correo o la contraseña
 * no son correctos», with a way to send the link again.
 */
export function UnconfirmedEmailCard({ email, onResend }: { email: string; onResend: () => void }) {
  return (
    <View accessibilityRole="alert" style={styles.card} testID="login-unconfirmed-email">
      <Text variant="titulo-fila">Todavía no confirmaste tu correo</Text>
      <Text variant="cuerpo">
        {`Te enviamos un enlace a ${email}. Ábrelo para activar tu cuenta y después inicia sesión.`}
      </Text>
      <OutlinedButton label="Reenviar correo" onPress={onResend} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.band,
    borderRadius: radii.button,
    borderWidth: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
});
