import {
  getGetStaffPaymentInvoiceFileUrl,
  getGetStaffPaymentInvoicePageUrl,
  type StaffInvoiceFileDto,
  formatDateTime,
} from "@pilates/api-contracts";
import {
  CardActionRow,
  cardWithActionRow,
  colors,
  FullScreenImage,
  Glyph,
  loadPrivateImageWithRatio,
  PdfInvoice,
  radii,
  spacing,
  surfaces,
  Text,
} from "@pilates/mobile-core";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";

// E-D19 «Por emitir»: the double-outlined box that says what to upload. It looks
// tappable, so it is: it opens the same choice as «Elegir factura»
// (walkthrough n.º 24).
export function InvoiceDropCard({ busy, onPress }: { busy: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel="Sube la factura emitida"
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [styles.drop, pressed && styles.pressed]}
    >
      <View pointerEvents="none" style={styles.dashes} testID="invoice-drop-dashes" />
      <View style={styles.disc}>
        {busy ? (
          <ActivityIndicator accessibilityLabel="Subiendo la factura" color={colors.primary} />
        ) : (
          <Glyph name="receipt" size={28} strokeWidth={1.6} />
        )}
      </View>
      <Text variant="titulo-fila">{busy ? "Subiendo la factura…" : "Sube la factura emitida"}</Text>
      <Text variant="secundario">Toca para elegir un PDF o una imagen, hasta 10 MB</Text>
    </Pressable>
  );
}

// E5 «Emitida»: the uploaded file and who uploaded it; a photo opens big,
// and a PDF shows its first page and opens in the app (follow-up 256 § 3).
export function InvoiceFileCard({
  file,
  paymentId,
}: {
  file: StaffInvoiceFileDto;
  paymentId: string;
}) {
  const fetcher = useStaffFetcher();
  const [open, setOpen] = useState(false);
  const photo = file.mediaType !== "application/pdf";
  const image = useQuery({
    queryKey: ["staff-invoice-file", paymentId, file.uploadedAt],
    queryFn: () => loadPrivateImageWithRatio(fetcher, getGetStaffPaymentInvoiceFileUrl(paymentId)),
    enabled: photo && open,
  });

  return (
    <View style={[styles.card, photo ? cardWithActionRow : null]}>
      <View style={styles.fileRow}>
        {photo ? (
          <View style={styles.thumb}>
            <Glyph name="image" size={22} strokeWidth={1.4} />
          </View>
        ) : (
          <PdfInvoice
            cacheKey={["staff-invoice-pages", paymentId, file.uploadedAt]}
            compact
            fetcher={fetcher}
            fileName={file.fileName}
            pageUrl={(page) => getGetStaffPaymentInvoicePageUrl(paymentId, page)}
          />
        )}
        <View style={styles.fileText}>
          <Text numberOfLines={1} variant="titulo-fila">
            {file.fileName}
          </Text>
          <Text variant="secundario">
            {`Subida por ${file.uploadedByName} · ${formatDateTime(file.uploadedAt)}`}
          </Text>
        </View>
      </View>
      {photo ? <CardActionRow label="Ver factura" onPress={() => setOpen(true)} /> : null}
      <FullScreenImage
        aspectRatio={image.data?.aspectRatio ?? 1}
        label="Factura ampliada"
        onClose={() => setOpen(false)}
        uri={image.data?.uri ?? null}
        visible={open}
      />
    </View>
  );
}

// The width of both E-D19 drop box lines.
const dropEdge = 1.5;

const styles = StyleSheet.create({
  card: { ...surfaces.card, gap: spacing.md, padding: spacing.lg },
  // FIX-089: the icon stands alone, with no tinted disc behind it.
  disc: { alignItems: "center", justifyContent: "center", minWidth: 28 },
  // E-D19: the dashed 400 line 6 pt inside the box's outer edge.
  dashes: {
    borderColor: colors.borderStrong,
    borderRadius: radii.card - 6,
    borderStyle: "dashed",
    borderWidth: dropEdge,
    bottom: 6 - dropEdge,
    left: 6 - dropEdge,
    position: "absolute",
    right: 6 - dropEdge,
    top: 6 - dropEdge,
  },
  // E-D19: a white box with a solid 400 edge, its text 20 pt from that edge.
  drop: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.borderStrong,
    borderRadius: radii.card,
    borderWidth: dropEdge,
    gap: spacing.smd,
    padding: spacing.xlSm - dropEdge,
  },
  fileRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  pressed: { opacity: 0.7 },
  fileText: { flex: 1, gap: 2 },
  thumb: {
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.borderSoft,
    borderRadius: 8,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
    width: 44,
  },
});
