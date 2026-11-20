import { colors, LineIcon, radii, spacing, Text } from "@pilates/mobile-core";
import { StyleSheet, View } from "react-native";
import { Circle, Polyline } from "react-native-svg";

/** The transient Éxito strip of `05`/`15` after «Guardar QR» (follow-up 95). */
export function QrSavedNotice() {
  return (
    <View accessibilityLiveRegion="polite" style={styles.notice}>
      <LineIcon color={colors.success} size={20} strokeWidth={1.6} style={styles.check}>
        <Circle cx={12} cy={12} r={9} />
        <Polyline points="8,12.4 11,15.2 16.2,9.4" />
      </LineIcon>
      <Text style={styles.noticeText} variant="cuerpo">
        QR guardado en tus fotos.
      </Text>
    </View>
  );
}

/**
 * The Error line under the action when saving was refused or failed. It sits
 * on its own white strip because the enlarged view's ground is 100, where a
 * `secundario` line may not stand (follow-up 285, rule 3).
 */
export function QrSaveFailure() {
  return (
    <View style={styles.failure}>
      <Text accessibilityLiveRegion="polite" style={styles.centered} variant="secundario">
        No pudimos guardar el QR. Permite que Emma Pilates agregue fotos en Ajustes.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { textAlign: "center" },
  check: { marginTop: spacing.xxs },
  failure: {
    alignSelf: "stretch",
    backgroundColor: colors.card,
    borderRadius: radii.inset,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  notice: {
    alignItems: "flex-start",
    alignSelf: "stretch",
    backgroundColor: colors.successTint,
    borderRadius: radii.inset,
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
  noticeText: { flexShrink: 1 },
});
