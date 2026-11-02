import { getGetTransferQrImageUrl } from "@pilates/api-contracts";
import {
  colors,
  fontFamilies,
  Glyph,
  loadPrivateImageWithRatio,
  OutlinedButton,
  radii,
  spacing,
  TextButton,
} from "@pilates/mobile-core";
import { useQuery } from "@tanstack/react-query";
import { Image, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";

export type FrontDeskReceipt = { imageAssetId: string };

/** S10 QR: the studio QR to show the Client, with the exact amount above it. */
export function StudioQrCard({ amount }: { amount: string }) {
  const fetcher = useStaffFetcher();
  const qr = useQuery({
    queryKey: ["studio-transfer-qr"],
    queryFn: () => loadPrivateImageWithRatio(fetcher, getGetTransferQrImageUrl()),
    retry: false,
  });
  return (
    <View style={styles.card}>
      <View style={styles.amountRow}>
        <Text style={styles.muted}>Monto exacto a transferir</Text>
        <Text style={styles.amount}>{amount}</Text>
      </View>
      <View
        accessibilityLabel="QR del estudio para transferir"
        accessibilityRole="image"
        style={styles.qrBox}
      >
        {qr.data ? (
          <Image
            source={{ uri: qr.data.uri }}
            style={[styles.qr, { aspectRatio: qr.data.aspectRatio }]}
          />
        ) : null}
      </View>
      <Text style={[styles.muted, styles.centred]}>QR del estudio · muéstraselo a la clienta</Text>
    </View>
  );
}

/**
 * S10 QR: the photographed receipt waits here until «Enviar comprobante»
 * (walkthrough 21, FIX-028); the photo alone sends nothing.
 */
export function FrontDeskReceiptCard({
  onPhotograph,
  receipt,
}: {
  /** Opens the camera or the library. */
  onPhotograph: () => void;
  receipt: FrontDeskReceipt | null;
}) {
  if (receipt === null) {
    return (
      <OutlinedButton
        label="Fotografiar comprobante"
        onPress={onPhotograph}
        testID="front-desk-photograph"
      />
    );
  }
  return (
    <View style={styles.receipt} testID="front-desk-receipt">
      <View style={styles.disc}>
        <Glyph color={colors.primary} name="check" size={18} strokeWidth={1.6} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>Comprobante fotografiado</Text>
        <Text style={styles.muted}>Todavía no se envió</Text>
      </View>
      <TextButton
        label="Fotografiar otra vez"
        onPress={onPhotograph}
        testID="front-desk-photograph"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  amount: { color: colors.text, fontFamily: fontFamilies.display, fontSize: 28 },
  amountRow: { alignItems: "center", gap: spacing.xxs },
  body: { flex: 1, gap: spacing.xxs },
  card: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radii.card,
    gap: spacing.md,
    padding: spacing.xlSm,
  },
  centred: { textAlign: "center" },
  disc: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  muted: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: 13 },
  qr: { height: undefined, width: "100%" },
  qrBox: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.inset,
    height: 180,
    justifyContent: "center",
    padding: spacing.md,
    width: 180,
  },
  receipt: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radii.card,
    flexDirection: "row",
    gap: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    paddingVertical: spacing.md,
  },
  title: { color: colors.text, fontFamily: fontFamilies.bodyMedium, fontSize: 15 },
});
