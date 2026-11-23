import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { biometricCopy } from "../auth/biometric-copy";
import { Glyph } from "./glyph";
import { OutlinedButton } from "./outlined-button";
import { Text } from "./text";
import { colors, radii, spacing } from "./tokens";

type BiometricWelcomeProps = {
  onUnlock: () => Promise<void> | void;
  onUsePassword: () => void;
};

/**
 * «Opción A», the next launch with biometrics on: «Hola de nuevo», the one
 * solid action that opens the prompt, and the way to the password form.
 */
export function BiometricWelcome({ onUnlock, onUsePassword }: BiometricWelcomeProps) {
  const [busy, setBusy] = useState(false);
  const unlock = async () => {
    setBusy(true);
    try {
      await onUnlock();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.welcome} testID="biometric-welcome">
      <Text accessibilityRole="header" style={styles.greeting} variant="titulo-bloque">
        Hola de nuevo
      </Text>
      <BiometricLoginButton busy={busy} onPress={() => void unlock()} />
      <OutlinedButton disabled={busy} label="Usar correo y contraseña" onPress={onUsePassword} />
    </View>
  );
}

/** The 600 action with the fingerprint glyph before its white `boton` label. */
export function BiometricLoginButton({ busy, onPress }: { busy: boolean; onPress: () => void }) {
  const label = biometricCopy().unlockLabel;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: busy }}
      disabled={busy}
      onPress={onPress}
      style={styles.button}
      testID="login-biometric-unlock"
    >
      <View style={[styles.content, busy && styles.hidden]}>
        <Glyph color={colors.onPrimary} name="fingerprint" size={22} strokeWidth={1.6} />
        <Text tone="onDark" variant="boton">
          {label}
        </Text>
      </View>
      {busy ? (
        <ActivityIndicator color={colors.onPrimary} size="small" style={styles.spinner} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    borderRadius: radii.button,
    borderWidth: 1.5,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  content: { alignItems: "center", flexDirection: "row", gap: spacing.smd },
  greeting: { textAlign: "center" },
  hidden: { opacity: 0 },
  spinner: { ...StyleSheet.absoluteFill },
  welcome: { gap: spacing.mdLg },
});
