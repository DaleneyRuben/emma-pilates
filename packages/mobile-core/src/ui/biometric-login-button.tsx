import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { FormAlert } from "../auth/auth-parts";
import { biometricCopy } from "../auth/biometric-copy";
import { Glyph } from "./glyph";
import { OutlinedButton } from "./outlined-button";
import { Text } from "./text";
import { colors, radii, spacing } from "./tokens";

type BiometricWelcomeProps = {
  /** The scan worked but the server could not be reached. */
  error: string | null;
  onUnlock: () => Promise<void> | void;
  onUseAnotherAccount: () => Promise<void> | void;
};

/**
 * «Hola de nuevo» (canvas B, iOS-3): after a cancelled prompt or a sign-out,
 * the solid action opens the prompt again and «Usar otra cuenta» forgets
 * biometrics on this phone for the password form.
 */
export function BiometricWelcome({ error, onUnlock, onUseAnotherAccount }: BiometricWelcomeProps) {
  const [busy, setBusy] = useState<"another-account" | "unlock" | null>(null);
  const copy = biometricCopy();
  const run = async (action: "another-account" | "unlock") => {
    setBusy(action);
    try {
      await (action === "unlock" ? onUnlock() : onUseAnotherAccount());
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.welcome} testID="biometric-welcome">
      <Text accessibilityRole="header" style={styles.centered} variant="titulo-bloque">
        Hola de nuevo
      </Text>
      {error === null ? null : <FormAlert>{error}</FormAlert>}
      <BiometricLoginButton
        busy={busy === "unlock"}
        disabled={busy !== null}
        onPress={() => void run("unlock")}
      />
      <OutlinedButton
        disabled={busy !== null}
        label="Usar otra cuenta"
        onPress={() => void run("another-account")}
      />
      {copy.otherAccountNote === null ? null : (
        <Text style={styles.centered} variant="secundario">
          {copy.otherAccountNote}
        </Text>
      )}
    </View>
  );
}

/** The 600 action with the Face ID or fingerprint glyph before its white `boton` label. */
export function BiometricLoginButton({
  busy,
  disabled = busy,
  onPress,
}: {
  busy: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const copy = biometricCopy();

  return (
    <Pressable
      accessibilityLabel={copy.unlockLabel}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={styles.button}
      testID="login-biometric-unlock"
    >
      <View style={[styles.content, busy && styles.hidden]}>
        <Glyph color={colors.onPrimary} name={copy.glyph} size={22} strokeWidth={1.6} />
        <Text tone="onDark" variant="boton">
          {copy.unlockLabel}
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
  centered: { textAlign: "center" },
  content: { alignItems: "center", flexDirection: "row", gap: spacing.smd },
  hidden: { opacity: 0 },
  spinner: { ...StyleSheet.absoluteFill },
  welcome: { gap: spacing.mdLg },
});
