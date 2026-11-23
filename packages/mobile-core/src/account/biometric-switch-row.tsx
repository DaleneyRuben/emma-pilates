import { useState } from "react";
import { StyleSheet, Switch, View } from "react-native";

import { biometricCopy } from "../auth/biometric-copy";
import { useMobileIdentity } from "../auth/identity-provider";
import { reportRecoveredError } from "../monitoring/error-reporting";
import { Glyph } from "../ui/glyph";
import { Text } from "../ui/text";
import { colors, rosa, spacing } from "../ui/tokens";

type BiometricSwitchRowProps = {
  /**
   * «disc» draws the glyph on the 36 pt 50 disc of the Client's Perfil rows;
   * «plain» leaves it alone, as the Staff app's rows do (FIX-089).
   */
  appearance?: "disc" | "plain";
};

/**
 * «El interruptor de B»: Perfil's row that turns Face ID or the fingerprint
 * on for this phone. It draws nothing where the phone cannot use biometrics,
 * but a row card should leave it out too, so no hairline is drawn for it.
 */
export function BiometricSwitchRow({ appearance = "disc" }: BiometricSwitchRowProps) {
  const { biometrics } = useMobileIdentity();
  const [busy, setBusy] = useState(false);

  if (!biometrics.available) return null;

  const copy = biometricCopy();
  const label = copy.switchLabel;
  const toggle = async (on: boolean) => {
    setBusy(true);
    try {
      if (on) await biometrics.enable();
      else await biometrics.disable();
    } catch (error) {
      // The switch keeps the state the identity still holds.
      reportRecoveredError(error);
    } finally {
      setBusy(false);
    }
  };
  const disc = appearance === "disc";

  return (
    <View style={[styles.row, !disc && styles.plainRow]}>
      <View style={disc ? styles.disc : styles.plainIcon} testID="biometric-switch-disc">
        <Glyph color={colors.text} name="fingerprint" size={disc ? 18 : 22} strokeWidth={1.6} />
      </View>
      <View style={styles.text}>
        <Text variant="titulo-fila">{label}</Text>
        <Text variant="secundario">
          {biometrics.enabled ? copy.switchOnNote : "Sin escribir tu contraseña"}
        </Text>
      </View>
      <Switch
        accessibilityLabel={label}
        accessibilityRole="switch"
        accessible
        disabled={busy}
        ios_backgroundColor={colors.border}
        onValueChange={(on) => void toggle(on)}
        testID="biometric-switch"
        thumbColor={colors.white}
        trackColor={{ false: colors.border, true: colors.primary }}
        value={biometrics.enabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    alignItems: "center",
    backgroundColor: rosa[50],
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  plainIcon: { alignItems: "center", justifyContent: "center", width: 24 },
  plainRow: { minHeight: 52, paddingVertical: spacing.smd },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
  text: { flex: 1, gap: spacing.xxs },
});
