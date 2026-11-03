import {
  colors,
  fontFamilies,
  Glyph,
  IconRowGroup,
  radii,
  spacing,
  TextButton,
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
      <View style={[styles.disc, error && styles.errorDisc]}>
        <Glyph
          color={error ? colors.error : colors.primary}
          name={error ? "cross" : "message"}
          size={18}
          strokeWidth={1.5}
        />
      </View>
      <View style={styles.body}>
        <Text style={[styles.label, error && styles.errorLabel]}>{label}</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
    </Pressable>
  );
}

/** S06's «Más opciones de la invitación» sheet: change the email or cancel. */
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
          <IconRowGroup>
            <MenuRow
              detail="Anula los enlaces al correo anterior"
              label="Cambiar correo"
              onPress={onChangeEmail}
            />
            <MenuRow
              detail={
                cancellable
                  ? "Libera el correo y borra la cuenta pendiente"
                  : "Ya tiene pagos o reservas, así que se mantiene"
              }
              disabled={!cancellable}
              label="Cancelar invitación"
              onPress={onCancel}
              tone="error"
            />
          </IconRowGroup>
          <TextButton label="Cerrar" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: colors.scrim, flex: 1, justifyContent: "flex-end" },
  body: { flex: 1, gap: spacing.xxs },
  detail: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: 13 },
  disabled: { opacity: 0.5 },
  disc: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  errorDisc: { backgroundColor: colors.errorSurface },
  errorLabel: { color: colors.error },
  grabber: {
    alignSelf: "center",
    backgroundColor: colors.hairline,
    borderRadius: radii.pill,
    height: 4,
    width: 36,
  },
  label: { color: colors.text, fontFamily: fontFamilies.bodyMedium, fontSize: 16 },
  pressed: { opacity: 0.7 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    gap: spacing.lg,
    padding: spacing.xlSm,
    paddingBottom: spacing.xxl,
  },
  title: { color: colors.text, fontFamily: fontFamilies.display, fontSize: 22 },
});
