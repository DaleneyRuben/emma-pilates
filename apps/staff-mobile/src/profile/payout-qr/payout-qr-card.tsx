import type { PayoutQrDto } from "@pilates/api-contracts";
import {
  colors,
  fontFamilies,
  FullScreenImage,
  Glyph,
  radii,
  spacing,
  surfaces,
} from "@pilates/mobile-core";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { payoutQrStateLine } from "./payout-qr-copy";
import { usePayoutQrImage } from "./use-payout-qr-image";

const box = 220;

/**
 * Her QR whole on a white box inside a Lino card (follow-up 95's rule: never
 * cropped, dark on light so it scans), its standing under it.
 */
export function PayoutQrCard({ qr }: { qr: PayoutQrDto }) {
  const image = usePayoutQrImage(qr.imageUrl, "readable");
  const [enlarged, setEnlarged] = useState(false);
  const ratio = image.data?.aspectRatio ?? 1;
  const size =
    ratio >= 1 ? { width: box, height: box / ratio } : { width: box * ratio, height: box };
  const line = payoutQrStateLine(qr);
  const tone =
    qr.standing === "expired"
      ? styles.error
      : qr.standing === "expiring"
        ? styles.warning
        : styles.ok;

  return (
    <View style={styles.card}>
      <View style={styles.qrBox}>
        {image.data === undefined ? (
          <View style={[styles.placeholder, { width: box, height: box }]}>
            {image.isError ? null : <ActivityIndicator color={colors.primary} />}
          </View>
        ) : (
          <Pressable
            accessibilityHint="Toca para ampliarlo."
            accessibilityLabel="Tu QR de cobro"
            accessibilityRole="imagebutton"
            onPress={() => setEnlarged(true)}
          >
            <Image resizeMode="contain" source={{ uri: image.data.uri }} style={size} />
          </Pressable>
        )}
      </View>
      <View style={styles.state}>
        <Glyph
          color={tone.color}
          name={qr.standing === "valid" ? "check" : qr.standing === "expiring" ? "clock" : "alert"}
          size={18}
          strokeWidth={1.5}
        />
        <Text style={[styles.stateText, tone]}>{line}</Text>
      </View>
      <FullScreenImage
        aspectRatio={ratio}
        label="Tu QR de cobro"
        note={line}
        onClose={() => setEnlarged(false)}
        title="Tu QR de cobro"
        tone="light"
        uri={image.data?.uri ?? null}
        visible={enlarged}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...surfaces.card,
    alignItems: "center",
    gap: spacing.md,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: 22,
  },
  error: { color: colors.error },
  ok: { color: colors.successText },
  // E-M09: the QR on white with a 1 pt 200 ring, so it scans.
  qrBox: {
    backgroundColor: colors.white,
    borderColor: colors.borderSoft,
    borderRadius: radii.inset,
    borderWidth: 1,
    padding: spacing.md,
  },
  placeholder: { alignItems: "center", justifyContent: "center" },
  state: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  stateText: { fontFamily: fontFamilies.bodyBold, fontSize: 15, fontWeight: "700" },
  warning: { color: colors.warningText },
});
