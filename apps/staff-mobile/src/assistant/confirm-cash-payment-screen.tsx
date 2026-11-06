import {
  getGetAssistantClientOverviewQueryKey,
  useGetAssistantClientInvoiceData,
  type AssistantCashPaymentDto,
  type PlanQuoteDto,
} from "@pilates/api-contracts";
import {
  boliviaCivilDate,
  colors,
  fontFamilies,
  formatBolivianos,
  FormScrollView,
  IconRowGroup,
  invoiceChoiceFrom,
  invoiceDataPayload,
  NextPlanStartChooser,
  type InvoiceChoice,
  NoticeRow,
  PrimaryButton,
  Screen,
  SectionTitle,
  SegmentedTabs,
  spacing,
  StartDateChooser,
  typography,
  useStudioRules,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { BackBar } from "../ui/back-bar";
import { BranchChips, useCashBranches } from "../ui/branch-chips";
import { ValueRow } from "../ui/value-row";
import { CenteredCard } from "./assistant-layout";
import { useAssistantWorkspace } from "./assistant-workspace";
import { AssistantApiError, createAssistantApi } from "./assistant-api";
import { describeClasses, formatCivilDate, formatCivilDayMonth } from "./assistant-format";
import { ClientBanner } from "./client-banner";
import type { ClientContext } from "./client-overview-screen";
import {
  FrontDeskReceiptCard,
  StudioQrCard,
  type FrontDeskReceipt,
} from "./front-desk-receipt-card";
import { InvoiceDisclosure } from "./invoice-disclosure";
import { loadReceiptUpload } from "./load-receipt-upload";
import { PaymentDone } from "./payment-done";

type ConfirmNavigation = {
  goBack: () => void;
  // Back to the search, dropping plan and payment (S10 «Volver a Clientes»).
  popTo: (screen: "ClientSearch") => void;
};

type Method = "cash" | "qr";
type Sent = { kind: "cash"; result: AssistantCashPaymentDto } | { kind: "transfer" };

const paymentProblems: Record<string, string> = {
  subscription_not_expired: "La clienta ya tiene un plan activo.",
  purchase_intent_open_exists: "La clienta tiene una compra en curso desde la app.",
  payment_pending_exists: "La clienta tiene un pago en revisión.",
  branch_not_assigned: "Solo puedes registrar pagos en tus sucursales.",
  plan_not_purchasable: "Este plan ya no está disponible.",
  start_date_out_of_window: "Esa fecha de inicio no está disponible.",
  future_subscription_exists: "El cliente ya tiene un plan siguiente.",
  start_date_before_booked_class:
    "La clienta tiene una clase reservada con su acceso actual. Elige un inicio después de esa clase.",
};

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

/**
 * S10 «Registrar pago» (walkthrough 21): «¿Cómo paga?» Efectivo or QR. Cash
 * confirms at once; QR shows the studio QR, takes a photo, and sends it on
 * its own button. Once one way is pending the other is off (FIX-028).
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
  const [method, setMethod] = useState<Method>("cash");
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  // The path the API holds as pending, from this screen or before it.
  const [lockedTo, setLockedTo] = useState<Method | null>(null);
  const [sent, setSent] = useState<Sent | null>(null);
  const studioRules = useStudioRules(fetcher);
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
  const amount = formatBolivianos(quote.priceCentavos);

  const refuse = (error: unknown, fallback: string, path: Method) => {
    const code = error instanceof AssistantApiError ? error.code : null;
    // The API already holds a pending payment: the other path is closed too.
    if (code === "payment_pending_exists") setLockedTo(path === "cash" ? "qr" : "cash");
    setFailure((code !== null ? paymentProblems[code] : undefined) ?? fallback);
  };

  const photograph = async () => {
    if (photographing) return;
    setPhotographing(true);
    setFailure(null);
    try {
      const { photographTransferReceipt } = await loadReceiptUpload();
      const photographed = await photographTransferReceipt(fetcher);
      if (photographed !== null) setReceipt(photographed);
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
      <Screen style={styles.screen}>
        <CenteredCard maxWidth={520}>
          <PaymentDone
            amount={result === null ? amount : formatBolivianos(result.payment.amountDueCentavos)}
            classes={describeClasses(result?.payment.classAllowance ?? quote.classAllowance)}
            endsOn={result?.subscription ? formatCivilDate(result.subscription.endsOn) : undefined}
            firstName={firstName(clientName)}
            kind={sent.kind}
            onBack={() => {
              if (workspace.split) workspace.show({ view: "overview", clientId });
              navigation.popTo("ClientSearch");
            }}
            scheduled={renewalStartsOn !== undefined}
            startsOn={nextStart === undefined ? undefined : formatCivilDayMonth(nextStart)}
          />
        </CenteredCard>
      </Screen>
    );
  }

  const discount =
    quote.listPriceCentavos !== undefined && quote.listPriceCentavos > quote.priceCentavos
      ? quote.listPriceCentavos - quote.priceCentavos
      : 0;
  const footer = (
    <View style={styles.footer}>
      {failure !== null ? (
        <View accessibilityLabel={failure} accessibilityRole="alert">
          <NoticeRow message={failure} />
        </View>
      ) : null}
      <Text style={styles.note}>
        {method === "cash"
          ? `Confirma con el efectivo en mano: ${
              renewalStartsOn === undefined
                ? "el plan se activa al instante."
                : "el plan queda programado para esa fecha."
            }`
          : "Queda pendiente hasta que administración lo apruebe. No entra en la caja."}
      </Text>
      {method === "cash" ? (
        <PrimaryButton
          busy={submitting}
          disabled={branchId === null || invoiceData === "incomplete" || lockedTo === "qr"}
          label="Confirmar pago en efectivo"
          onPress={() => void confirm()}
          testID="cash-confirm"
        />
      ) : (
        <PrimaryButton
          busy={submitting}
          disabled={branchId === null || receipt === null || lockedTo === "cash"}
          label="Enviar comprobante"
          onPress={() => void sendReceipt()}
          testID="front-desk-send"
        />
      )}
    </View>
  );

  return (
    <Screen style={styles.screen}>
      <CenteredCard maxWidth={520}>
        <BackBar onBack={() => navigation.goBack()} title="Registrar pago" />
        <FormScrollView contentContainerStyle={styles.content} footer={footer}>
          <ClientBanner
            action="Para"
            clientName={clientName}
            clientPhoto={clientPhoto}
            detail={`plan de ${describeClasses(quote.classAllowance)}`}
          />
          <View>
            <SectionTitle>¿Cómo paga?</SectionTitle>
            <SegmentedTabs
              accessibilityLabel="¿Cómo paga?"
              onSelect={(next) => {
                setMethod(next);
                setFailure(null);
              }}
              options={[
                { key: "cash", label: "Efectivo", disabled: lockedTo === "qr" },
                { key: "qr", label: "QR", disabled: lockedTo === "cash" },
              ]}
              selected={method}
            />
          </View>
          {method === "cash" ? (
            <View>
              <SectionTitle>A cobrar</SectionTitle>
              <IconRowGroup>
                <ValueRow
                  label={quote.name}
                  value={formatBolivianos(quote.listPriceCentavos ?? quote.priceCentavos)}
                />
                {discount > 0 ? (
                  <ValueRow
                    label="Descuento"
                    tone="emphasis"
                    value={`−${formatBolivianos(discount)}`}
                  />
                ) : null}
                {/* Credit is retired (PAY-005): the cash collected is the full price. */}
                <ValueRow label="Total en efectivo" strong value={amount} />
              </IconRowGroup>
            </View>
          ) : (
            <>
              <StudioQrCard amount={amount} />
              <FrontDeskReceiptCard onPhotograph={() => void photograph()} receipt={receipt} />
            </>
          )}
          {renewalStartsOn !== undefined ? (
            <NextPlanStartChooser
              currentPlan={`El plan actual de ${firstName(clientName)}`}
              firstDay={renewalStartsOn}
              onSelect={setNextStart}
              selected={nextStart ?? renewalStartsOn}
            />
          ) : studioRules === undefined ? null : (
            <StartDateChooser
              openingDate={studioRules.openingDate}
              selected={startsOn}
              startDateLimitDays={studioRules.startDateLimitDays}
              today={today}
              onSelect={setStartsOn}
            />
          )}
          <BranchChips
            label={
              method === "cash" ? "Sucursal donde recibes el efectivo" : "Sucursal de la venta"
            }
            onSelect={branches.select}
            options={branches.options}
            selectedId={branchId}
            testIDPrefix="cash-branch"
          />
          {/* The transfer API takes no invoice data, so the fold is for cash only. */}
          {method === "cash" ? (
            <InvoiceDisclosure onChange={setInvoiceEdit} value={invoice} />
          ) : null}
        </FormScrollView>
      </CenteredCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingBottom: spacing.xl },
  footer: { gap: spacing.sm, paddingTop: spacing.md },
  note: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
    textAlign: "center",
  },
  screen: { gap: spacing.md, paddingHorizontal: spacing.xlSm },
});
