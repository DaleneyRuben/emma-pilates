import { colors, radii, spacing, typography } from "@pilates/mobile-core";
import { StyleSheet, Text, View } from "react-native";

// The persistent reminder of whose behalf the Assistant is acting on.
export function ClientBanner({
  action,
  clientName,
}: {
  action: "Reservando para" | "Registrando pago para" | "Viendo reservas de" | "Viendo historial de";
  clientName: string;
}) {
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{`${action}: ${clientName}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.primaryTint,
    borderRadius: radii.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  text: { color: colors.primaryOnTint, fontSize: typography.note, fontWeight: "600" },
});
