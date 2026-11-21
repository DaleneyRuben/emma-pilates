import { Modal, Pressable, StyleSheet, View } from "react-native";

import { Chevron } from "../ui/chevron";
import { Glyph, type GlyphName } from "../ui/glyph";
import { SheetTitle } from "../ui/sheet-title";
import { Text } from "../ui/text";
import { TextButton } from "../ui/text-button";
import { colors, radii, rosa, shadows, spacing } from "../ui/tokens";
import { SecondaryButton } from "./auth-parts";

export type CheckEmailSheetKind = "cancel" | "options" | null;

function OptionRow({
  hint,
  icon,
  label,
  onPress,
}: {
  hint: string;
  icon: GlyphName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityHint={hint}
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.option, pressed && styles.pressed]}
    >
      <View style={styles.optionDisc}>
        <Glyph color={colors.text} name={icon} size={18} strokeWidth={1.6} />
      </View>
      <View style={styles.optionText}>
        <Text variant="titulo-fila">{label}</Text>
        <Text variant="secundario">{hint}</Text>
      </View>
      <Chevron size={16} strokeWidth={1.5} />
    </Pressable>
  );
}

/**
 * «Opciones» and «¿Cancelar tu registro?» over «Revisa tu correo» (C01o,
 * C01x): the white sheet with its grabber, a Lora title, and the choices.
 */
export function CheckEmailSheet({
  kind,
  onAskCancel,
  onCancel,
  onClose,
  onCorrect,
  submitting,
}: {
  kind: CheckEmailSheetKind;
  onAskCancel: () => void;
  onCancel: () => void;
  onClose: () => void;
  onCorrect: () => void;
  submitting: boolean;
}) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={() => {
        if (!submitting) onClose();
      }}
      transparent
      visible={kind !== null}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          {kind === "cancel" ? (
            <>
              <SheetTitle>¿Cancelar tu registro?</SheetTitle>
              <Text variant="cuerpo">
                El enlace deja de funcionar y el correo queda libre para registrarte de nuevo.
              </Text>
              <SecondaryButton
                busy={submitting}
                label="Sí, cancelar registro"
                onPress={onCancel}
                tone="error"
              />
              <TextButton
                disabled={submitting}
                label="Volver"
                onPress={onClose}
                style={styles.centered}
              />
            </>
          ) : (
            <>
              <SheetTitle>Opciones</SheetTitle>
              <View style={styles.options}>
                <OptionRow
                  hint="Si lo escribiste mal"
                  icon="mail"
                  label="Cambiar correo"
                  onPress={onCorrect}
                />
                <View style={styles.hairline} />
                <OptionRow
                  hint="Libera el correo para empezar de nuevo"
                  icon="cross"
                  label="Cancelar registro"
                  onPress={onAskCancel}
                />
              </View>
              <Text variant="secundario">
                El enlace vence en 24 horas. Si no lo abres en 7 días, borramos el registro.
              </Text>
              <TextButton label="Cerrar" onPress={onClose} style={styles.centered} />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: colors.scrim,
    flex: 1,
    justifyContent: "flex-end",
  },
  centered: { alignSelf: "center" },
  grabber: {
    alignSelf: "center",
    backgroundColor: colors.band,
    borderRadius: radii.pill,
    height: 5,
    width: 40,
  },
  hairline: { backgroundColor: colors.hairline, height: 1 },
  option: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
  optionDisc: {
    alignItems: "center",
    backgroundColor: rosa[50],
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  optionText: { flex: 1, gap: spacing.xxs },
  // The choices sit on white with a 1 pt 200 rule.
  options: {
    backgroundColor: colors.card,
    borderColor: colors.borderSoft,
    borderRadius: radii.card,
    borderWidth: 1,
    overflow: "hidden",
  },
  pressed: { backgroundColor: colors.rowHover },
  sheet: {
    ...shadows.sheet,
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.band,
    borderTopRightRadius: radii.band,
    gap: spacing.mdLg,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xlSm,
    paddingTop: spacing.md,
  },
});
