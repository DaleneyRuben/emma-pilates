import {
  getGetAssistantClientOverviewQueryKey,
  useGetAssistantClientInvoiceData,
  type AssistantCashPaymentDto,
  type PlanQuoteDto,
  formatMoney,
  formatListDate,
} from "@pilates/api-contracts";
import {
  boliviaCivilDate,
  colors,
  fontFamilies,
  FormScrollView,
  invoiceChoiceFrom,
  invoiceDataPayload,
  invoiceIncompleteNote,
  type InvoiceChoice,
  NoticeRow,
  PrimaryButton,
  Screen,
  spacing,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { bodyScroll, FooterPanel, taskEdges } from "../ui/card-pieces";
import { useStaffFetcher } from "../staff-fetcher";
import { BackBar } from "../ui/back-bar";
import { useCashBranches } from "../ui/branch-chips";
import { CenteredCard } from "./assistant-layout";
import { useAssistantWorkspace } from "./assistant-workspace";
import { AssistantApiError, createAssistantApi } from "./assistant-api";
import { describeClasses } from "./assistant-format";
import { BranchCard } from "./branch-card";
import type { ClientContext } from "./client-overview-screen";
import {
  FrontDeskReceiptCard,
  StudioQrCard,
  type FrontDeskReceipt,
  type ReceiptSource,
} from "./front-desk-receipt-card";
import { InvoiceSwitch } from "./invoice-switch";
import { loadReceiptUpload } from "./load-receipt-upload";
import { PaymentChargeBlock } from "./payment-charge-block";
import { PaymentDone } from "./payment-done";
import { PaymentMethodOptions, type PaymentMethod } from "./payment-method-options";
import { PaymentStartDays } from "./payment-start-days";

type ConfirmNavigation = {
  goBack: () => void;
  // Back to the tab's root, dropping plan and payment (S10 «Volver a Clientas»).
  popToTop: () => void;
};

type Sent = { kind: "cash"; result: AssistantCashPaymentDto } | { kind: "transfer" };

const paymentProblems: Record<string, string> = {
  subscription_not_expired: "La clienta ya tiene un plan activo.",
  purchase_intent_open_exists: "La clienta tiene una compra en curso desde la app.",
  payment_pending_exists: "La clienta tiene un pago en revisión.",
  branch_not_assigned: "Solo puedes registrar pagos en tus sucursales.",
  plan_not_purchasable: "Este plan ya no está disponible.",
  start_date_out_of_window: "Esa fecha de inicio no está disponible.",
  future_subscription_exists: "La clienta ya tiene un plan siguiente.",
  start_date_before_booked_class:
    "La clienta tiene una clase reservada con su acceso actual. Elige un inicio después de esa clase.",
};

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

/**
 * S10 «Registrar pago», staff pick E3 C: what is collected on top, Efectivo
 * or QR as large options, «Empieza» as a strip of days, «Pide factura» as a
 * switch, and one button. Cash confirms at once; QR shows the studio QR,
 * takes a photo, and sends it from the same button. Once one way is pending
 * the other is off (FIX-028).
 */
export function ConfirmCashPaymentScreen({
  route,
}: {
  route: { params: ClientContext & { quote: PlanQuoteDto; renewalStartsOn?: string } };
}) {
  const { clientId, clientName, clientPhoto, quote, renewalStartsOn } = route.params;
  const navigation = useNavigation<ConfirmNavigation>();
  const workspace = useAssistantWorkspace();
  const fetcher = useStaffFetcher();
  const queryClient = useQueryClient();
  const api = useMemo(() => createAssistantApi(fetcher), [fetcher]);
  const branches = useCashBranches();
  const branchId = branches.branch?.id ?? null;
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  // The path the API holds as pending, from this screen or before it.
  const [lockedTo, setLockedTo] = useState<PaymentMethod | null>(null);
  const [sent, setSent] = useState<Sent | null>(null);
  const today = boliviaCivilDate(new Date());
  const [startsOn, setStartsOn] = useState(today);
  // booking ADR-0013: a next Plan picks its day too, the day after by default.
  const [nextStart, setNextStart] = useState(renewalStartsOn);
  const [receipt, setReceipt] = useState<FrontDeskReceipt | null>(null);
  const [photographing, setPhotographing] = useState(false);
  // PAY-007: prefilled from the Client's last sale; a failed read leaves «Sin factura».
  const lastInvoice = useGetAssistantClientInvoiceData(clientId, { fetcher });
  const [invoiceEdit, setInvoiceEdit] = useState<InvoiceChoice | null>(null);
  const invoice =
    invoiceEdit ??
    invoiceChoiceFrom(
      lastInvoice.data?.status === 200 ? (lastInvoice.data.data.invoiceData ?? null) : null,
    );
  const invoiceData = invoiceDataPayload(invoice);
  const start = renewalStartsOn === undefined ? startsOn : nextStart;
  const amount = formatMoney(quote.priceCentavos);

  const refuse = (error: unknown, fallback: string, path: PaymentMethod) => {
    const code = error instanceof AssistantApiError ? error.code : null;
    // The API already holds a pending payment: the other path is closed too.
    if (code === "payment_pending_exists") setLockedTo(path === "cash" ? "qr" : "cash");
    setFailure((code !== null ? paymentProblems[code] : undefined) ?? fallback);
  };

  const chooseReceipt = async (source: ReceiptSource) => {
    if (photographing) return;
    setPhotographing(true);
    setFailure(null);
    try {
      const { chooseTransferReceipt } = await loadReceiptUpload();
      const chosen = await chooseTransferReceipt(fetcher, source);
      if (chosen !== null) setReceipt(chosen);
    } catch {
      setFailure("No pudimos subir la foto. Inténtalo de nuevo.");
    } finally {
      setPhotographing(false);
    }
  };

  const sendReceipt = async () => {
    if (branchId === null || receipt === null) return;
    setSubmitting(true);
    setFailure(null);
    try {
      await api.recordFrontDeskTransfer(clientId, quote.id, branchId, receipt.imageAssetId, start);
      setLockedTo("qr");
      setSent({ kind: "transfer" });
    } catch (error) {
      refuse(error, "No pudimos enviar el comprobante. Inténtalo de nuevo.", "qr");
    } finally {
      setSubmitting(false);
    }
  };

  const confirm = async () => {
    if (branchId === null || invoiceData === "incomplete") return;
    setSubmitting(true);
    setFailure(null);
    try {
      const recorded = await api.recordCashPayment(
        clientId,
        quote.id,
        branchId,
        start,
        invoiceData,
      );
      await queryClient.invalidateQueries({
        queryKey: getGetAssistantClientOverviewQueryKey(clientId),
      });
      setLockedTo("cash");
      setSent({ kind: "cash", result: recorded });
    } catch (error) {
      refuse(error, "No pudimos registrar el pago. Inténtalo de nuevo.", "cash");
    } finally {
      setSubmitting(false);
    }
  };

  if (sent !== null) {
    const result = sent.kind === "cash" ? sent.result : null;
    return (
      <Screen edges={taskEdges} style={[styles.screen, bodyScroll.taskScreen]}>
        <CenteredCard maxWidth={520} style={styles.column}>
          <PaymentDone
            amount={result === null ? amount : formatMoney(result.payment.amountDueCentavos)}
            classes={describeClasses(result?.payment.classAllowance ?? quote.classAllowance)}
            endsOn={result?.subscription ? formatListDate(result.subscription.endsOn) : undefined}
            firstName={firstName(clientName)}
            kind={sent.kind}
            onBack={() => {
              if (workspace.split) workspace.show({ view: "overview", clientId });
              // Back to the tab's root: Clientas' search, or Hoy when the sale began there (E7).
              navigation.popToTop();
            }}
            scheduled={renewalStartsOn !== undefined}
            startsOn={nextStart === undefined ? undefined : formatListDate(nextStart)}
          />
        </CenteredCard>
      </Screen>
    );
  }

  const cash = method === "cash";
  const branchMissing = branchId === null ? "Elige la sucursal de la venta" : undefined;
  // E-P02: the hint and the button share the white footer panel.
  const footer = (
    <FooterPanel bleed={0}>
      {failure !== null ? (
        <View accessibilityLabel={failure} accessibilityRole="alert">
          <NoticeRow message={failure} />
        </View>
      ) : null}
      <Text style={styles.note}>
        {cash
          ? `Confirma con el efectivo en mano: ${
              renewalStartsOn === undefined
                ? "el plan se activa al instante."
                : "el plan queda programado para esa fecha."
            }`
          : "Queda pendiente hasta que administración lo apruebe. No entra en la caja."}
      </Text>
      {cash ? (
        <PrimaryButton
          busy={submitting}
          disabled={branchId === null || invoiceData === "incomplete" || lockedTo === "qr"}
          disabledReason={branchMissing ?? invoiceIncompleteNote(invoice) ?? undefined}
          label={`Confirmar ${amount} en efectivo`}
          onPress={() => void confirm()}
          testID="cash-confirm"
        />
      ) : (
        <PrimaryButton
          busy={submitting}
          disabled={branchId === null || receipt === null || lockedTo === "cash"}
          disabledReason={
            branchMissing ?? (receipt === null ? "Primero fotografía el comprobante" : undefined)
          }
          label={`Confirmar ${amount} por QR`}
          onPress={() => void sendReceipt()}
          testID="front-desk-send"
        />
      )}
    </FooterPanel>
  );

  return (
    <Screen edges={taskEdges} style={[styles.screen, bodyScroll.taskScreen]}>
      <CenteredCard maxWidth={520} style={styles.column}>
        <BackBar onBack={() => navigation.goBack()} title="Registrar pago" />
        <View style={bodyScroll.clip}>
          <FormScrollView contentContainerStyle={bodyScroll.content} footer={footer}>
            <PaymentChargeBlock clientName={clientName} clientPhoto={clientPhoto} quote={quote} />
            <PaymentMethodOptions
              lockedTo={lockedTo}
              onSelect={(next) => {
                setMethod(next);
                setFailure(null);
              }}
              selected={method}
            />
            {cash ? null : (
              <>
                <StudioQrCard amount={amount} />
                <FrontDeskReceiptCard
                  onChoose={(source) => void chooseReceipt(source)}
                  receipt={receipt}
                />
              </>
            )}
            <PaymentStartDays
              onSelect={renewalStartsOn === undefined ? setStartsOn : setNextStart}
              renewalStartsOn={renewalStartsOn}
              selected={start ?? startsOn}
              today={today}
            />
            {/* The transfer API takes no invoice data, so the switch is for cash only. */}
            {cash ? <InvoiceSwitch onChange={setInvoiceEdit} value={invoice} /> : null}
            <BranchCard
              label={cash ? "Sucursal donde recibes el efectivo" : "Sucursal de la venta"}
              onSelect={branches.select}
              options={branches.options}
              selectedId={branchId}
              testIDPrefix="cash-branch"
            />
          </FormScrollView>
        </View>
      </CenteredCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  column: { gap: 0 },
  note: {
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
    lineHeight: 18,
    textAlign: "center",
  },
  screen: { paddingHorizontal: spacing.xlSm },
});
