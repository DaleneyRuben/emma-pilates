import { BodyText, colors, radii, spacing, surfaces, typography } from "@pilates/mobile-core";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type FrontDeskReceipt = { imageAssetId: string };

/**
 * The Assistant photographs the Client's transfer receipt. The Payment stays
 * pending for the existing review (decisions §4.2). Cash is a separate button.
 */
export function FrontDeskReceiptCard({
  onPhotograph,
  receipt,
}: {
  /** Opens the camera or the library and returns the READY receipt, or null. */
  onPhotograph: () => Promise<FrontDeskReceipt | null> | void;
  receipt: FrontDeskReceipt | null;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Comprobante de transferencia</Text>
      <BodyText style={styles.note}>
        {receipt === null
          ? "Fotografía el comprobante. El pago queda pendiente hasta que la administración lo apruebe."
          : "Comprobante listo. El pago queda pendiente de revisión."}
      </BodyText>
      <Pressable
        accessibilityLabel="Fotografiar comprobante"
        accessibilityRole="button"
        onPress={onPhotograph}
        style={styles.button}
        testID="front-desk-photograph"
      >
        <Text style={styles.buttonLabel}>Fotografiar comprobante</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderRadius: radii.control,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  buttonLabel: { color: colors.text, fontSize: typography.body },
  card: { ...surfaces.card, gap: spacing.sm, padding: spacing.lg },
  note: { color: colors.textMuted, fontSize: typography.note },
  title: { color: colors.text, fontSize: 16, fontWeight: "500" },
});
