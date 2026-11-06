import {
  getGetCurrentClientInvoiceFileUrl,
  useListCurrentClientInvoices,
  type ClientInvoiceDto,
} from "@pilates/api-contracts";
import {
  BrandToast,
  colors,
  EmptyState,
  fontFamilies,
  formatBolivianos,
  FormScrollView,
  Glyph,
  LoadingState,
  loadPrivateImageWithRatio,
  NoticeRow,
  PrimaryButton,
  QueryFailure,
  Screen,
  ScreenTopBar,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { downloadInvoice } from "./invoice-download";
import { invoiceDate } from "./invoice-parts";

function Details({ invoice }: { invoice: ClientInvoiceDto }) {
  const rows: [string, string][] = [
    ["Compra", `${invoice.purchaseLabel} · ${formatBolivianos(invoice.amountDueCentavos)}`],
    ["NIT o CI", invoice.invoiceData.taxId],
    ["A nombre de", invoice.invoiceData.name],
  ];
  if (invoice.file !== null) rows.push(["Emitida", invoiceDate(invoice.file.uploadedAt)]);
  if (invoice.voided) rows.push(["Estado", "Pago anulado"]);
  return (
    <View style={styles.card}>
      {rows.map(([label, value], index) => (
        <View key={label} style={[styles.kv, index > 0 && styles.divided]}>
          <Text style={styles.kvLabel}>{label}</Text>
          <Text style={styles.kvValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function Preview({ invoice }: { invoice: ClientInvoiceDto }) {
  const fetcher = useClientFetcher();
  const photo = invoice.file !== null && invoice.file.mediaType !== "application/pdf";
  const image = useQuery({
    queryKey: ["client-invoice-preview", invoice.paymentId, invoice.file?.uploadedAt],
    queryFn: () =>
      loadPrivateImageWithRatio(fetcher, getGetCurrentClientInvoiceFileUrl(invoice.paymentId)),
    enabled: photo,
  });
  if (photo && image.data != null) {
    return (
      <Image
        accessibilityLabel="Vista previa de la factura"
        resizeMode="contain"
        source={{ uri: image.data.uri }}
        style={[styles.photo, { aspectRatio: image.data.aspectRatio }]}
      />
    );
  }
  return (
    <View accessibilityLabel="Factura en PDF" style={styles.page}>
      <Glyph name="document" size={40} strokeWidth={1.2} />
      <Text numberOfLines={2} style={styles.fileName}>
        {invoice.file?.fileName}
      </Text>
    </View>
  );
}

// FIX-044 (K2/K3 «Abierta»): one invoice, its data, and «Descargar».
export function InvoiceDetailScreen({ route }: { route: { params: { paymentId: string } } }) {
  const navigation = useNavigation<{ goBack: () => void }>();
  const fetcher = useClientFetcher();
  const list = useListCurrentClientInvoices({ fetcher });
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const header = <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Factura" />;

  if (list.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando la factura" />
      </Screen>
    );
  }
  const invoice =
    list.data?.status === 200
      ? list.data.data.items.find((item) => item.paymentId === route.params.paymentId)
      : undefined;
  if (invoice === undefined) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure label="No pudimos cargar la factura." onRetry={() => void list.refetch()} />
      </Screen>
    );
  }

  if (invoice.file === null) {
    return (
      <Screen style={styles.screen}>
        {header}
        <EmptyState
          icon="hourglass"
          message="Te avisamos cuando esté lista."
          title="El estudio está preparando tu factura"
        />
        <Details invoice={invoice} />
      </Screen>
    );
  }
  const file = invoice.file;

  const download = async () => {
    setBusy(true);
    setFailed(false);
    setSaved(false);
    try {
      const outcome = await downloadInvoice({
        fetcher,
        paymentId: invoice.paymentId,
        fileName: file.fileName,
        mediaType: file.mediaType,
      });
      setSaved(outcome === "saved");
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen style={styles.screen}>
      <FormScrollView
        contentContainerStyle={styles.content}
        footer={
          <View style={styles.footer}>
            {failed ? (
              <View accessibilityRole="alert">
                <NoticeRow message="No pudimos descargar la factura. Inténtalo de nuevo." />
              </View>
            ) : null}
            <PrimaryButton busy={busy} label="Descargar" onPress={() => void download()} />
          </View>
        }
      >
        {header}
        <Preview invoice={invoice} />
        <Details invoice={invoice} />
      </FormScrollView>
      {saved ? (
        <BrandToast onClose={() => setSaved(false)} style={styles.toast} title="Factura guardada" />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { ...surfaces.card },
  content: { gap: spacing.lg, paddingBottom: spacing.xl },
  divided: { borderTopColor: colors.hairline, borderTopWidth: 1 },
  fileName: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
    textAlign: "center",
  },
  footer: { gap: spacing.xs, paddingTop: spacing.md },
  kv: {
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  kvLabel: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.body },
  kvValue: {
    color: colors.text,
    flexShrink: 1,
    fontFamily: fontFamilies.body,
    fontSize: typography.body,
    fontVariant: ["tabular-nums"],
    textAlign: "right",
  },
  page: {
    alignItems: "center",
    alignSelf: "center",
    aspectRatio: 210 / 297,
    backgroundColor: colors.white,
    borderColor: colors.hairline,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    justifyContent: "center",
    padding: spacing.lg,
    width: 200,
  },
  photo: { alignSelf: "center", borderRadius: 8, maxHeight: 320, width: "100%" },
  screen: { paddingHorizontal: spacing.xlSm },
  toast: { bottom: spacing.xl * 4, left: 0, position: "absolute", right: 0 },
});
