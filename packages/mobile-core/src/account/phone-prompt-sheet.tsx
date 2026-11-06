import { KeyboardAvoidingView, Modal, StyleSheet, Text, View } from "react-native";

import { fontFamilies } from "../ui/fonts";
import { Glyph } from "../ui/glyph";
import { PhoneField, type PhoneValue } from "../ui/phone-field";
import { PrimaryButton } from "../ui/primary-button";
import { TextButton } from "../ui/text-button";
import { colors, radii, spacing, typography } from "../ui/tokens";

const reason = "El estudio te escribe por WhatsApp si cambia una clase o hay un aviso de tu plan.";

/**
 * Design follow-up 254 § 1 (walkthrough 2 n.º 34): the sheet that asks a
 * Client without a valid mobile for one, over Inicio. «Agrega tu celular»
 * when none is stored, «Revisa tu celular» when the stored one is not valid.
 */
export function PhonePromptSheet({
  busy,
  error,
  failed,
  missing,
  onChange,
  onLater,
  onSave,
  value,
  visible,
}: {
  busy: boolean;
  error: string | null;
  failed: boolean;
  missing: boolean;
  onChange: (next: PhoneValue) => void;
  onLater: () => void;
  onSave: () => void;
  value: PhoneValue;
  visible: boolean;
}) {
  return (
    <Modal animationType="slide" onRequestClose={onLater} transparent visible={visible}>
      <KeyboardAvoidingView
        // A Modal on Android does not resize with the keyboard, so the
        // sheet pads itself above it on both platforms.
        behavior="padding"
        style={styles.backdrop}
      >
        <View style={styles.sheet} testID="phone-prompt-sheet">
          <View style={styles.handle} />
          <View style={styles.disc}>
            <Glyph color={colors.primary} name="phone" size={24} strokeWidth={1.5} />
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            {missing ? "Agrega tu celular" : "Revisa tu celular"}
          </Text>
          <Text style={styles.reason}>
            {missing ? reason : `El número que tenemos no es un celular válido. ${reason}`}
          </Text>
          <PhoneField
            error={error ?? undefined}
            onChange={onChange}
            testID="phone-prompt-field"
            value={value}
          />
          {failed ? (
            <Text accessibilityRole="alert" style={styles.failure}>
              No pudimos guardar tu celular. Inténtalo de nuevo.
            </Text>
          ) : null}
          <PrimaryButton busy={busy} label="Guardar" onPress={onSave} testID="phone-prompt-save" />
          <TextButton label="Ahora no" onPress={onLater} testID="phone-prompt-later" />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: colors.scrim, flex: 1, justifyContent: "flex-end" },
  disc: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  failure: { color: colors.error, fontFamily: fontFamilies.body, fontSize: typography.note },
  handle: {
    alignSelf: "center",
    backgroundColor: colors.hairline,
    borderRadius: radii.pill,
    height: 5,
    width: 36,
  },
  reason: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: typography.body,
    lineHeight: 22,
  },
  sheet: {
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: spacing.lg,
    maxWidth: 560,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xlSm,
    paddingTop: spacing.md,
    width: "100%",
  },
  title: { color: colors.text, fontFamily: fontFamilies.display, fontSize: 24 },
});
