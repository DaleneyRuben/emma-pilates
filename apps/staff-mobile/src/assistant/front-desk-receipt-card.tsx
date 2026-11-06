import { getGetTransferQrImageUrl } from "@pilates/api-contracts";
import {
  colors,
  fontFamilies,
  Glyph,
  loadPrivateImageWithRatio,
  radii,
  spacing,
  TextButton,
} from "@pilates/mobile-core";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

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

export type ReceiptSource = "camera" | "library";

/**
 * S10 QR: the receipt waits here until «Enviar comprobante» (walkthrough 21,
 * FIX-028); choosing it sends nothing. It comes from the camera or from the
 * gallery, for one the Client sent by WhatsApp (design follow-up 254 § 2).
 */
export function FrontDeskReceiptCard({
  onChoose,
  receipt,
}: {
  onChoose: (source: ReceiptSource) => void;
  receipt: FrontDeskReceipt | null;
}) {
  const [changing, setChanging] = useState(false);
  const choose = (source: ReceiptSource) => {
    setChanging(false);
    onChoose(source);
  };
  if (receipt === null || changing) {
    return (
      <View style={styles.choice} testID="front-desk-receipt-choice">
        <View style={styles.head}>
          <View style={styles.disc}>
            <Glyph color={colors.primary} name="camera" size={18} />
          </View>
          <View style={styles.body}>
            <Text style={styles.title}>Comprobante</Text>
            <Text style={styles.muted}>
              Fotografíalo o elígelo de la galería si llegó por WhatsApp
            </Text>
          </View>
        </View>
        <SourceButton
          icon="camera"
          label="Fotografiar comprobante"
          onPress={() => choose("camera")}
          testID="front-desk-photograph"
        />
        <SourceButton
          icon="image"
          label="Elegir de la galería"
          onPress={() => choose("library")}
          testID="front-desk-gallery"
        />
      </View>
    );
  }
  return (
    <View style={styles.receipt} testID="front-desk-receipt">
      <View style={styles.disc}>
        <Glyph color={colors.primary} name="check" size={18} strokeWidth={1.6} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>Comprobante listo</Text>
        <Text style={styles.muted}>Todavía no se envió</Text>
      </View>
      <TextButton label="Cambiar" onPress={() => setChanging(true)} testID="front-desk-change" />
    </View>
  );
}

function SourceButton({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: "camera" | "image";
  label: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.source, pressed && styles.pressed]}
      testID={testID}
    >
      <Glyph color={colors.primaryOnTint} name={icon} size={18} strokeWidth={1.6} />
      <Text style={styles.sourceLabel}>{label}</Text>
    </Pressable>
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
  choice: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    gap: spacing.md,
    padding: spacing.lg,
  },
  disc: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  head: { alignItems: "center", flexDirection: "row", gap: spacing.md },
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
  pressed: { opacity: 0.85 },
  source: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: radii.inset,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  sourceLabel: { color: colors.primaryOnTint, fontFamily: fontFamilies.bodyStrong, fontSize: 15 },
  title: { color: colors.text, fontFamily: fontFamilies.bodyMedium, fontSize: 15 },
});
