import {
  getGetCurrentClientInvoiceFileUrl,
  getGetCurrentClientInvoicePageUrl,
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
  LoadingState,
  loadPrivateImageWithRatio,
  NoticeRow,
  PdfInvoice,
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
import { useState, type ReactNode } from "react";
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

// Follow-up 256 § 3 (verification n.º 45): a PDF shows its first page and
// opens every page in the viewer, whose footer downloads it too.
function Preview({ invoice, footer }: { invoice: ClientInvoiceDto; footer: ReactNode }) {
  const fetcher = useClientFetcher();
  const pdf = invoice.file?.mediaType === "application/pdf";
  const image = useQuery({
    queryKey: ["client-invoice-preview", invoice.paymentId, invoice.file?.uploadedAt],
    queryFn: () =>
      loadPrivateImageWithRatio(fetcher, getGetCurrentClientInvoiceFileUrl(invoice.paymentId)),
    enabled: invoice.file !== null && !pdf,
  });
  if (pdf) {
    return (
      <PdfInvoice
        cacheKey={["client-invoice-pages", invoice.paymentId, invoice.file?.uploadedAt]}
        fetcher={fetcher}
        footer={footer}
        pageUrl={(page) => getGetCurrentClientInvoicePageUrl(invoice.paymentId, page)}
      />
    );
  }
  if (image.data == null) return null;
  return (
    <Image
      accessibilityLabel="Vista previa de la factura"
      resizeMode="contain"
      source={{ uri: image.data.uri }}
      style={[styles.photo, { aspectRatio: image.data.aspectRatio }]}
    />
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

  const downloadButton = (
    <PrimaryButton busy={busy} label="Descargar" onPress={() => void download()} />
  );

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
            {downloadButton}
          </View>
        }
      >
        {header}
        <Preview footer={downloadButton} invoice={invoice} />
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
  photo: { alignSelf: "center", borderRadius: 8, maxHeight: 320, width: "100%" },
  screen: { paddingHorizontal: spacing.xlSm },
  toast: { bottom: spacing.xl * 4, left: 0, position: "absolute", right: 0 },
});
