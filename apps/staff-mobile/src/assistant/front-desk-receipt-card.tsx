import { getGetTransferQrImageUrl } from "@pilates/api-contracts";
import {
  colors,
  fontFamilies,
  Glyph,
  loadPrivateImageWithRatio,
  radii,
  spacing,
  surfaces,
  TextButton,
  typography,
} from "@pilates/mobile-core";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";

export type FrontDeskReceipt = { imageAssetId: string };

/** S10 QR (E-P05): the studio QR to show the Client, the exact amount beside it. */
export function StudioQrCard({ amount }: { amount: string }) {
  const fetcher = useStaffFetcher();
  const qr = useQuery({
    queryKey: ["studio-transfer-qr"],
    queryFn: () => loadPrivateImageWithRatio(fetcher, getGetTransferQrImageUrl()),
    retry: false,
  });
  return (
    <View style={styles.card}>
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
      <View style={styles.amountColumn}>
        <Text style={styles.amountLabel}>Monto exacto a transferir</Text>
        <Text style={styles.amount}>{amount}</Text>
        <Text style={styles.muted}>QR del estudio · muéstraselo a la clienta</Text>
      </View>
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
            <Glyph color={colors.text} name="camera" size={22} strokeWidth={1.6} />
          </View>
          <View style={styles.body}>
            <Text style={styles.title}>Comprobante</Text>
            <Text style={styles.muted}>
              Fotografíalo o elígelo de la galería si llegó por WhatsApp
            </Text>
          </View>
        </View>
        <View style={styles.sources}>
          <SourceButton
            label="Fotografiar comprobante"
            onPress={() => choose("camera")}
            testID="front-desk-photograph"
          />
          <SourceButton
            label="Elegir de la galería"
            onPress={() => choose("library")}
            testID="front-desk-gallery"
          />
        </View>
      </View>
    );
  }
  return (
    <View style={styles.receipt} testID="front-desk-receipt">
      <View style={styles.disc}>
        <Glyph color={colors.text} name="check" size={22} strokeWidth={1.6} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>Comprobante listo</Text>
        <Text style={styles.muted}>Todavía no se envió</Text>
      </View>
      <TextButton label="Cambiar" onPress={() => setChanging(true)} testID="front-desk-change" />
    </View>
  );
}

// E-P05: the two sources side by side, white with a 600 outline.
function SourceButton({
  label,
  onPress,
  testID,
}: {
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
      <Text style={styles.sourceLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  amount: { color: colors.text, fontFamily: fontFamilies.display, fontSize: 32, lineHeight: 38 },
  amountColumn: { flex: 1, gap: spacing.xxs },
  amountLabel: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.body },
  body: { flex: 1, gap: spacing.xxs },
  card: {
    ...surfaces.card,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.mdLg,
    padding: spacing.lg,
  },
  choice: { ...surfaces.card, gap: spacing.md, padding: spacing.lg },
  // FIX-089: the icon stands alone, with no tinted disc behind it.
  disc: { alignItems: "center", paddingTop: 1, width: 24 },
  head: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md },
  muted: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.note },
  qr: { height: undefined, width: "100%" },
  qrBox: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.borderSoft,
    borderRadius: radii.inset,
    borderWidth: 1,
    height: 140,
    justifyContent: "center",
    padding: spacing.sm,
    width: 140,
  },
  receipt: {
    ...surfaces.card,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    paddingVertical: spacing.md,
  },
  pressed: { opacity: 0.85 },
  // FIX-089: the secondary button, white with a 600 outline.
  source: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.primary,
    borderRadius: radii.button,
    borderWidth: 1.5,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.sm,
  },
  sourceLabel: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  sources: { flexDirection: "row", gap: spacing.smLg },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.bodyMedium,
    fontWeight: "700",
  },
});
