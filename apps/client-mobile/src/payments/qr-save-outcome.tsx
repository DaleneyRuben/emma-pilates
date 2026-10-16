import { BodyText, colors, fontFamilies, LineIcon, radii, spacing } from "@pilates/mobile-core";
import { StyleSheet, Text, View } from "react-native";
import { Circle, Polyline } from "react-native-svg";

/** The transient Éxito strip of `05`/`15` after «Guardar QR» (follow-up 95). */
export function QrSavedNotice() {
  return (
    <View accessibilityLiveRegion="polite" style={styles.notice}>
      <LineIcon color={colors.success} size={20} strokeWidth={1.6} style={styles.check}>
        <Circle cx={12} cy={12} r={9} />
        <Polyline points="8,12.4 11,15.2 16.2,9.4" />
      </LineIcon>
      <Text style={styles.noticeText}>QR guardado en tus fotos.</Text>
    </View>
  );
}

/** The Error line under the action when saving was refused or failed. */
export function QrSaveFailure() {
  return (
    <BodyText accessibilityLiveRegion="polite" style={styles.failure}>
      No pudimos guardar el QR. Permite que Emma Pilates agregue fotos en Ajustes.
    </BodyText>
  );
}

const styles = StyleSheet.create({
  check: { marginTop: spacing.xxs },
  failure: { color: colors.errorText, fontSize: 13, textAlign: "center" },
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
  noticeText: {
    color: colors.text,
    flexShrink: 1,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 15,
  },
});
