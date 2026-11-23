import { Modal, StyleSheet, View } from "react-native";

import { biometricCopy } from "../auth/biometric-copy";
import { Glyph } from "./glyph";
import { PrimaryButton } from "./primary-button";
import { SheetTitle } from "./sheet-title";
import { Text } from "./text";
import { TextButton } from "./text-button";
import { colors, radii, rosa, shadows, spacing } from "./tokens";

type BiometricOfferSheetProps = {
  /** The prompt is open: the action spins and «Ahora no» waits. */
  busy?: boolean;
  onDismiss: () => void;
  onEnable: () => void;
  visible: boolean;
};

/**
 * «Opción A»: right after a password sign-in, a bottom sheet offers Face ID or
 * the fingerprint for the next time, the glyph on a 72 pt 100 disc.
 */
export function BiometricOfferSheet({
  busy = false,
  onDismiss,
  onEnable,
  visible,
}: BiometricOfferSheetProps) {
  const copy = biometricCopy();
  const dismiss = () => {
    if (!busy) onDismiss();
  };

  return (
    <Modal animationType="slide" onRequestClose={dismiss} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.sheet} testID="biometric-offer-sheet">
          <View style={styles.grabber} />
          <View style={styles.disc} testID="biometric-offer-disc">
            <Glyph name="fingerprint" size={36} strokeWidth={1.5} />
          </View>
          <SheetTitle style={styles.centered}>Entra más rápido</SheetTitle>
          <Text style={styles.centered} variant="cuerpo">
            {copy.offerBody}
          </Text>
          <Text style={styles.centered} variant="secundario">
            Puedes cambiarlo cuando quieras en Perfil.
          </Text>
          <PrimaryButton
            busy={busy}
            label={copy.offerAction}
            onPress={onEnable}
            testID="biometric-offer-enable"
          />
          <TextButton disabled={busy} label="Ahora no" onPress={dismiss} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: colors.scrim, flex: 1, justifyContent: "flex-end" },
  centered: { textAlign: "center" },
  disc: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: rosa[100],
    borderRadius: 36,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  grabber: {
    alignSelf: "center",
    backgroundColor: colors.band,
    borderRadius: 3,
    height: 5,
    width: 40,
  },
  sheet: {
    ...shadows.sheet,
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.band,
    borderTopRightRadius: radii.band,
    gap: spacing.mdLg,
    paddingBottom: spacing.xxl + spacing.xxs,
    paddingHorizontal: spacing.xlSm,
    paddingTop: spacing.md,
  },
});
