import {
  getGetStaffPaymentInvoiceFileUrl,
  getGetStaffPaymentInvoicePageUrl,
  type StaffInvoiceFileDto,
} from "@pilates/api-contracts";
import {
  CardActionRow,
  cardWithActionRow,
  colors,
  fontFamilies,
  FullScreenImage,
  Glyph,
  loadPrivateImageWithRatio,
  PdfInvoice,
  radii,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { formatSubmittedAt } from "../administrator/administrator-format";
import { useStaffFetcher } from "../staff-fetcher";

// E5 «Por emitir»: the dashed box that says what to upload.
export function InvoiceDropCard({ busy }: { busy: boolean }) {
  return (
    <View style={styles.drop}>
      <View style={styles.disc}>
        {busy ? (
          <ActivityIndicator accessibilityLabel="Subiendo la factura" color={colors.primary} />
        ) : (
          <Glyph name="receipt" size={18} strokeWidth={1.5} />
        )}
      </View>
      <Text style={styles.title}>{busy ? "Subiendo la factura…" : "Sube la factura emitida"}</Text>
      <Text style={styles.muted}>Foto de la factura, hasta 10 MB</Text>
    </View>
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
            pageUrl={(page) => getGetStaffPaymentInvoicePageUrl(paymentId, page)}
          />
        )}
        <View style={styles.fileText}>
          <Text numberOfLines={1} style={styles.title}>
            {file.fileName}
          </Text>
          <Text style={styles.muted}>
            {`Subida por ${file.uploadedByName} · ${formatSubmittedAt(file.uploadedAt)}`}
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

const styles = StyleSheet.create({
  card: { ...surfaces.card, gap: spacing.md, padding: spacing.lg },
  disc: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  drop: {
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderRadius: radii.card,
    borderStyle: "dashed",
    borderWidth: 1.5,
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  fileRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  fileText: { flex: 1, gap: 2 },
  muted: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  thumb: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.hairline,
    borderRadius: 6,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
    width: 44,
  },
  title: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.bodyMedium },
});
