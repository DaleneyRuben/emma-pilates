import {
  getGetStaffPaymentInvoiceQueryKey,
  getListStaffInvoicesQueryKey,
  useGetStaffPaymentInvoice,
  type StaffInvoiceDto,
} from "@pilates/api-contracts";
import {
  BrandToast,
  ConfirmationSheet,
  EmphasisCard,
  FormScrollView,
  formatBolivianos,
  IconRow,
  IconRowGroup,
  LoadingState,
  NoticeRow,
  PrimaryButton,
  QueryFailure,
  Screen,
  SectionTitle,
  TextButton,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { BackBar } from "../ui/back-bar";
import { invoiceStyles as styles } from "./invoice-styles";
import { InvoiceApiError, createInvoicesApi } from "./invoices-api";
import { InvoiceDropCard, InvoiceFileCard } from "./invoice-cards";
import { InvoiceSourceSheet, type InvoiceSource } from "./invoice-source-sheet";
import { loadInvoiceUpload } from "./load-invoice-upload";

const conflicts: Record<string, string> = {
  payment_voided: "Este pago fue anulado y ya no recibe factura.",
  payment_not_confirmed: "Este pago todavía no está confirmado.",
  payment_without_invoice_data: "La clienta no pidió factura en este pago.",
};
const uploadFailure = "No pudimos subir la factura. Revisa tu conexión e inténtalo de nuevo.";
const rejected = "Este archivo no sirve. Sube un PDF, JPG o PNG de hasta 10 MB.";

const failureOf = (error: unknown): string =>
  error instanceof InvoiceApiError && error.code !== null && conflicts[error.code] !== undefined
    ? conflicts[error.code]!
    : error instanceof Error && error.message === "upload_rejected"
      ? rejected
      : uploadFailure;

// FIX-044 (follow-up 248, E5): the payment's invoice, uploaded as a photo,
// replaced, or removed after asking. Every change is recorded with who and
// when; nothing is deleted.
export function InvoiceScreen({ route }: { route: { params: { paymentId: string } } }) {
  const { paymentId } = route.params;
  const navigation = useNavigation<{ goBack: () => void }>();
  const fetcher = useStaffFetcher();
  const queryClient = useQueryClient();
  const api = useMemo(() => createInvoicesApi(fetcher), [fetcher]);
  const invoice = useGetStaffPaymentInvoice(paymentId, {
    fetcher,
    query: { refetchOnMount: "always" },
  });
  const [choosing, setChoosing] = useState(false);
  const [source, setSource] = useState<InvoiceSource | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  const header = <BackBar onBack={() => navigation.goBack()} title="Factura del pago" />;
  if (invoice.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando el pago" />
      </Screen>
    );
  }
  if (invoice.isError || invoice.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure label="No pudimos cargar el pago." onRetry={() => void invoice.refetch()} />
      </Screen>
    );
  }
  const current = invoice.data.data as StaffInvoiceDto;
  const firstName = current.clientName.split(" ")[0];

  const settle = async (next: StaffInvoiceDto, message: string) => {
    queryClient.setQueryData(getGetStaffPaymentInvoiceQueryKey(paymentId), {
      data: next,
      status: 200,
      headers: new Headers(),
    });
    await queryClient.invalidateQueries({ queryKey: getListStaffInvoicesQueryKey() });
    setNotice(message);
  };

  const upload = async (from: InvoiceSource) => {
    setChoosing(false);
    setSource(from);
    setBusy(true);
    setFailure(null);
    setNotice(null);
    try {
      const { pickInvoicePhoto } = await loadInvoiceUpload();
      const picked = await pickInvoicePhoto(fetcher, from);
      if (picked !== null) {
        await settle(await api.attach(paymentId, picked), "Factura subida");
      }
    } catch (error) {
      setFailure(failureOf(error));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await settle(await api.remove(paymentId), "Factura quitada");
      setAsking(false);
    } catch {
      setFailure("No pudimos quitar la factura. Inténtalo de nuevo.");
      setAsking(false);
    } finally {
      setBusy(false);
    }
  };

  const data = current.invoiceData;
  const canUpload = data !== null && !current.voided;
  const footer = !canUpload ? undefined : (
    <View style={styles.actions}>
      {failure === null ? null : (
        <View accessibilityLabel={failure} accessibilityRole="alert">
          <NoticeRow message={failure} />
        </View>
      )}
      {failure !== null && source !== null ? (
        <>
          <PrimaryButton busy={busy} label="Reintentar" onPress={() => void upload(source)} />
          <TextButton label="Elegir otro archivo" onPress={() => setChoosing(true)} />
        </>
      ) : current.file === null ? (
        <>
          <PrimaryButton busy={busy} label="Subir factura" onPress={() => setChoosing(true)} />
          <Text style={styles.note}>
            {`Al subirla, el pago queda como factura emitida y ${firstName} la ve en su app.`}
          </Text>
        </>
      ) : (
        <View style={styles.row}>
          <TextButton label="Reemplazar" onPress={() => setChoosing(true)} />
          <TextButton label="Quitar factura" onPress={() => setAsking(true)} tone="error" />
        </View>
      )}
    </View>
  );

  return (
    <Screen style={styles.screen}>
      <FormScrollView contentContainerStyle={styles.content} footer={footer}>
        {header}
        <EmphasisCard
          eyebrow="Monto"
          note={`${current.clientName} · ${current.purchaseLabel}`}
          pill={
            current.voided ? "Anulado" : current.file === null ? "Confirmado" : "Factura emitida"
          }
        >
          <Text style={styles.amount}>{formatBolivianos(current.amountDueCentavos)}</Text>
        </EmphasisCard>
        <View style={styles.section}>
          <SectionTitle>Datos de la factura</SectionTitle>
          <IconRowGroup>
            {data === null ? (
              <IconRow icon="receipt" label="Sin factura" value="No la pidió" />
            ) : (
              <>
                <IconRow icon="receipt" label="NIT o CI" value={data.taxId} />
                <IconRow icon="person" label="A nombre de" value={data.name} />
              </>
            )}
          </IconRowGroup>
        </View>
        {current.file === null ? (
          canUpload ? (
            <InvoiceDropCard busy={busy} />
          ) : null
        ) : (
          <InvoiceFileCard file={current.file} paymentId={paymentId} />
        )}
      </FormScrollView>
      {notice === null ? null : (
        <BrandToast
          note={notice === "Factura subida" ? `${firstName} ya puede verla en su app` : undefined}
          onClose={() => setNotice(null)}
          style={styles.toast}
          title={notice}
        />
      )}
      <InvoiceSourceSheet
        onChoose={(from) => void upload(from)}
        onDismiss={() => setChoosing(false)}
        visible={choosing}
      />
      <ConfirmationSheet
        busy={busy}
        confirmLabel="Sí, quitar factura"
        dismissLabel="Cancelar"
        onConfirm={() => void remove()}
        onDismiss={() => setAsking(false)}
        note={`${firstName} dejará de verla en Mis facturas y el pago vuelve a quedar por emitir. Queda registrado quién la quitó.`}
        title="¿Quitar la factura?"
        visible={asking}
      />
    </Screen>
  );
}
