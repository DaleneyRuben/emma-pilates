import {
  getGetStaffPaymentInvoiceQueryKey,
  getListStaffInvoicesQueryKey,
  useGetStaffPaymentInvoice,
  type StaffInvoiceDto,
  formatMoney,
} from "@pilates/api-contracts";
import {
  BrandToast,
  ConfirmationSheet,
  EmphasisCard,
  FormScrollView,
  IconRow,
  LoadingState,
  NoticeRow,
  PrimaryButton,
  QueryFailure,
  Screen,
  Text,
  TextButton,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { View } from "react-native";

import { bodyScroll, FooterPanel, RowCard, taskEdges } from "../ui/card-pieces";
import { useStaffFetcher } from "../staff-fetcher";
import { BackBar } from "../ui/back-bar";
import { invoiceStyles as styles } from "./invoice-styles";
import { InvoiceApiError, createInvoicesApi } from "./invoices-api";
import { InvoiceDropCard, InvoiceFileCard } from "./invoice-cards";
import { InvoiceSourceSheet, type InvoiceSource } from "./invoice-source-sheet";
import type { PickedImage } from "../uploads/image-upload";
import { loadDocumentUpload } from "../uploads/load-document-upload";
import { loadImageUpload } from "../uploads/load-image-upload";

const conflicts: Record<string, string> = {
  payment_voided: "Este pago fue anulado y ya no recibe factura.",
  payment_not_confirmed: "Este pago todavía no está confirmado.",
  payment_without_invoice_data: "La clienta no pidió factura en este pago.",
};
const uploadFailure = "No pudimos subir la factura. Revisa tu conexión e inténtalo de nuevo.";
const rejected = "Este archivo no sirve. Sube un PDF, JPG o PNG de hasta 10 MB.";
// FIX-049: a build made before expo-document-picker has no file picker.
const pdfNeedsUpdate = "Para subir un PDF, actualiza la app. Mientras tanto puedes subir una foto.";

const isConflict = (code: string | null): boolean => code !== null && conflicts[code] !== undefined;

const failureOf = (error: unknown): string =>
  error instanceof InvoiceApiError && error.code !== null && conflicts[error.code] !== undefined
    ? conflicts[error.code]!
    : error instanceof Error && error.message === "upload_rejected"
      ? rejected
      : uploadFailure;

// FIX-044 (follow-up 248, E5): the payment's invoice, uploaded as a photo or
// (FIX-049) a PDF from the phone's files, replaced, or removed after asking.
// Every change is recorded with who and when; nothing is deleted.
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
  // The photo she picked and, once uploaded, its asset: «Reintentar» only
  // repeats what failed, never the picker (FIX-044 review).
  const [picked, setPicked] = useState<PickedImage | null>(null);
  const [uploadedAssetId, setUploadedAssetId] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);
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

  const reset = () => {
    setPicked(null);
    setUploadedAssetId(null);
    setFailure(null);
    setRetryable(false);
  };

  const send = async (photo: PickedImage, assetId: string | null) => {
    setBusy(true);
    setFailure(null);
    setNotice(null);
    try {
      const { uploadImage } = await loadImageUpload();
      const imageAssetId = assetId ?? (await uploadImage(photo, "invoice", fetcher));
      setUploadedAssetId(imageAssetId);
      await settle(
        await api.attach(paymentId, { imageAssetId, fileName: photo.fileName ?? "factura.jpg" }),
        "Factura subida",
      );
      reset();
    } catch (error) {
      const conflict = error instanceof InvoiceApiError && isConflict(error.code);
      setFailure(failureOf(error));
      setRetryable(!conflict);
      // The payment changed meanwhile (a void, say): show it as it is now.
      if (conflict) void invoice.refetch();
    } finally {
      setBusy(false);
    }
  };

  const upload = async (from: InvoiceSource) => {
    setChoosing(false);
    reset();
    let pickPdf: (() => Promise<PickedImage | null>) | undefined;
    if (from === "document") {
      try {
        ({ pickPdf } = await loadDocumentUpload());
      } catch {
        setFailure(pdfNeedsUpdate);
        return;
      }
    }
    try {
      const photo =
        pickPdf !== undefined
          ? await pickPdf()
          : await (await loadImageUpload()).pickImage({ camera: from === "camera" });
      if (photo === null) return;
      setPicked(photo);
      await send(photo, null);
    } catch (error) {
      setFailure(failureOf(error));
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await settle(await api.remove(paymentId), "Factura quitada");
      setAsking(false);
    } catch (error) {
      setFailure(
        error instanceof InvoiceApiError && isConflict(error.code)
          ? failureOf(error)
          : "No pudimos quitar la factura. Inténtalo de nuevo.",
      );
      setRetryable(false);
      setAsking(false);
    } finally {
      setBusy(false);
    }
  };

  const data = current.invoiceData;
  const canUpload = data !== null && !current.voided;
  const footer = !canUpload ? undefined : (
    <FooterPanel bleed={0}>
      {failure === null ? null : (
        <View accessibilityLabel={failure} accessibilityRole="alert">
          <NoticeRow message={failure} />
        </View>
      )}
      {failure !== null && retryable && picked !== null ? (
        <>
          <PrimaryButton
            busy={busy}
            label="Reintentar"
            onPress={() => void send(picked, uploadedAssetId)}
          />
          <View style={styles.row}>
            <TextButton label="Elegir otro archivo" onPress={() => setChoosing(true)} />
            <TextButton label="Cancelar" onPress={reset} />
          </View>
        </>
      ) : current.file === null ? (
        <>
          <PrimaryButton busy={busy} label="Subir factura" onPress={() => setChoosing(true)} />
          <Text style={styles.note} variant="secundario">
            {`Al subirla, el pago queda como factura emitida y ${firstName} la ve en su app.`}
          </Text>
        </>
      ) : (
        <View style={styles.row}>
          <TextButton label="Reemplazar" onPress={() => setChoosing(true)} />
          <TextButton label="Quitar factura" onPress={() => setAsking(true)} />
        </View>
      )}
    </FooterPanel>
  );

  return (
    <Screen
      edges={canUpload ? taskEdges : undefined}
      style={[styles.screen, canUpload && bodyScroll.taskScreen]}
    >
      {header}
      <View style={bodyScroll.clip}>
        <FormScrollView contentContainerStyle={bodyScroll.content} footer={footer}>
          <EmphasisCard>
            <View style={styles.heroTop}>
              <Text style={styles.heroLabel} tone="onDark" variant="etiqueta">
                Monto
              </Text>
              <Text tone="onDark" variant="pastilla">
                {current.voided
                  ? "Anulado"
                  : current.file === null
                    ? "Confirmado"
                    : "Factura emitida"}
              </Text>
            </View>
            <Text tone="onDark" variant="cifra-grande">
              {formatMoney(current.amountDueCentavos)}
            </Text>
            <Text
              tone="onDark"
              variant="cuerpo"
            >{`${current.clientName} · ${current.purchaseLabel}`}</Text>
          </EmphasisCard>
          <RowCard label="Datos de la factura">
            {data === null ? (
              <IconRow icon="receipt" label="Sin factura" value="No la pidió" />
            ) : (
              [
                <IconRow icon="receipt" key="tax" label="NIT o CI" value={data.taxId} />,
                <IconRow icon="person" key="name" label="A nombre de" value={data.name} />,
              ]
            )}
          </RowCard>
          {current.file === null ? (
            canUpload ? (
              <InvoiceDropCard busy={busy} />
            ) : null
          ) : (
            <InvoiceFileCard file={current.file} paymentId={paymentId} />
          )}
        </FormScrollView>
      </View>
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
