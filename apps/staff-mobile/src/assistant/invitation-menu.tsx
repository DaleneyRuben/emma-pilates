import {
  colors,
  fontFamilies,
  Glyph,
  radii,
  shadows,
  spacing,
  TextButton,
  typography,
} from "@pilates/mobile-core";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

type Option = {
  detail: string;
  disabled?: boolean;
  label: string;
  onPress: () => void;
  tone?: "error";
};

function MenuRow({ detail, disabled = false, label, onPress, tone }: Option) {
  const error = tone === "error";
  return (
    <Pressable
      accessibilityLabel={`${label}, ${detail}`}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <View style={styles.disc}>
        <Glyph color={colors.text} name={error ? "cross" : "message"} size={18} strokeWidth={1.5} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.label, error && styles.errorLabel]}>{label}</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
    </Pressable>
  );
}

/**
 * S06's «Más opciones de la invitación» sheet (E-C13): the white sheet with
 * its grabber, the Lora title, and the two ways on split by hairlines.
 */
export function InvitationMenu({
  cancellable,
  firstName,
  onCancel,
  onChangeEmail,
  onClose,
  visible,
}: {
  cancellable: boolean;
  firstName: string;
  onCancel: () => void;
  onChangeEmail: () => void;
  onClose: () => void;
  visible: boolean;
}) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View accessibilityRole="none" style={styles.sheet} testID="invitation-menu">
          <View style={styles.grabber} />
          <Text style={styles.title}>{`Invitación de ${firstName}`}</Text>
          <View>
            <MenuRow
              detail="Anula los enlaces al correo anterior"
              label="Cambiar correo"
              onPress={onChangeEmail}
            />
            <MenuRow
              detail={
                cancellable
                  ? "Libera el correo y anula la cuenta pendiente"
                  : "Ya tiene pagos o reservas, así que se mantiene"
              }
              disabled={!cancellable}
              label="Cancelar invitación"
              onPress={onCancel}
              tone="error"
            />
          </View>
          <TextButton label="Cerrar" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: colors.scrim, flex: 1, justifyContent: "flex-end" },
  body: { flex: 1, gap: spacing.xxs },
  detail: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.note },
  disabled: { opacity: 0.5 },
  // FIX-089: the icon stands alone, with no tinted disc behind it.
  disc: { alignItems: "center", justifyContent: "center", width: 24 },
  errorLabel: { color: colors.text },
  // The 200 grabber, drawn as its outline so no 200 fill sits on the sheet.
  grabber: {
    alignSelf: "center",
    borderColor: colors.borderSoft,
    borderRadius: radii.pill,
    borderWidth: 2.5,
    height: 5,
    marginBottom: spacing.sm,
    width: 40,
  },
  label: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.bodyMedium,
    fontWeight: "600",
  },
  pressed: { opacity: 0.7 },
  row: {
    alignItems: "center",
    borderTopColor: colors.hairline,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.mdLg,
    minHeight: 64,
    paddingVertical: spacing.mdLg,
  },
  sheet: {
    ...shadows.sheet,
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.band,
    borderTopRightRadius: radii.band,
    gap: spacing.smd,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xlSm,
    paddingTop: spacing.md,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: typography.section,
    lineHeight: 30,
    marginBottom: spacing.sm,
  },
});
