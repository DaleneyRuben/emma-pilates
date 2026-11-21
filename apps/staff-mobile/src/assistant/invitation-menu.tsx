import {
  colors,
  Glyph,
  radii,
  shadows,
  SheetTitle,
  spacing,
  Text,
  TextButton,
} from "@pilates/mobile-core";
import { Modal, Pressable, StyleSheet, View } from "react-native";

type Option = {
  detail: string;
  disabled?: boolean;
  label: string;
  onPress: () => void;
  tone?: "error";
};

// An option that is off stays in full ink (follow-up 285, rule 5): its detail
// line says why, in words, and it sits on the 50 inset instead of fading.
function MenuRow({ detail, disabled = false, label, onPress, tone }: Option) {
  const error = tone === "error";
  return (
    <Pressable
      accessibilityLabel={`${label}, ${detail}`}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, disabled && styles.disabled, pressed && styles.pressed]}
    >
      <View style={styles.disc}>
        <Glyph color={colors.text} name={error ? "cross" : "message"} size={18} strokeWidth={1.5} />
      </View>
      <View style={styles.body}>
        <Text variant="titulo-fila">{label}</Text>
        <Text variant="secundario">{detail}</Text>
      </View>
    </Pressable>
  );
}

/**
 * S06's «Más opciones de la invitación» sheet (E-C13): the white sheet with
 * its grabber, the sheet title, and the two ways on split by hairlines.
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
          <SheetTitle style={styles.title}>{`Invitación de ${firstName}`}</SheetTitle>
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
  disabled: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.inset,
    paddingHorizontal: spacing.md,
  },
  // FIX-089: the icon stands alone, with no tinted disc behind it.
  disc: { alignItems: "center", justifyContent: "center", width: 24 },
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
  title: { marginBottom: spacing.sm },
});
