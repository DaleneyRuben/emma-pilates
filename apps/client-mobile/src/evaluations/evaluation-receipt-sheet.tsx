import type { ClientEvaluationDto } from "@pilates/api-contracts";
import {
  colors,
  formatBolivianos,
  radii,
  SectionTitle,
  spacing,
  surfaces,
  TextButton,
  typography,
} from "@pilates/mobile-core";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ReceiptRow } from "../payments/receipt-row";
import { TransferQrCard } from "../payments/transfer-qr-card";

/**
 * C15c: «Sube tu comprobante» from Mis evaluaciones, with C14b's two steps,
 * the studio QR and then the receipt (follow-up 262). Choosing a receipt
 * uploads it; the screen closes the sheet once it is attached.
 */
export function EvaluationReceiptSheet({
  evaluation,
  fetcher,
  uploading,
  onAttach,
  onClose,
}: {
  evaluation: ClientEvaluationDto | null;
  fetcher: typeof globalThis.fetch;
  uploading: boolean;
  onAttach: () => void;
  onClose: () => void;
}) {
  const amount =
    evaluation !== null && evaluation.priceCentavos > 0
      ? formatBolivianos(evaluation.priceCentavos)
      : undefined;

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={evaluation !== null}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Cerrar" onPress={onClose} style={styles.dismiss} />
        <View style={styles.sheet} testID="evaluation-receipt-sheet">
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.grab} />
            <Text accessibilityRole="header" style={styles.title}>
              Sube tu comprobante
            </Text>
            <View>
              <SectionTitle>1 · Paga con el QR del estudio</SectionTitle>
              <TransferQrCard amount={amount} fetcher={fetcher} />
            </View>
            <View>
              <SectionTitle>2 · Sube tu comprobante</SectionTitle>
              <View style={styles.group}>
                <ReceiptRow
                  onAttach={onAttach}
                  onRemove={() => undefined}
                  receipt={null}
                  testID="evaluation-receipt-sheet-row"
                  uploading={uploading}
                />
              </View>
            </View>
            <TextButton label="Volver" onPress={onClose} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: colors.scrim, flex: 1, justifyContent: "flex-end" },
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  dismiss: { flex: 1, minHeight: spacing.xxxl },
  grab: {
    alignSelf: "center",
    backgroundColor: colors.hairline,
    borderRadius: 999,
    height: 5,
    width: 36,
  },
  group: { ...surfaces.card },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.frame,
    borderTopRightRadius: radii.frame,
    maxHeight: "92%",
    paddingHorizontal: spacing.xlSm,
    paddingTop: spacing.smLg,
  },
  title: { color: colors.text, fontSize: typography.titleSecondary, fontWeight: "500" },
});
