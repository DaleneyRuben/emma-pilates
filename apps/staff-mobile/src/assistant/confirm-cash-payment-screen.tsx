import {
  getGetAssistantClientOverviewQueryKey,
  useGetAssistantClientInvoiceData,
  type AssistantCashPaymentDto,
  type PlanQuoteDto,
} from "@pilates/api-contracts";
import {
  BackLink,
  BodyText,
  colors,
  describePlanTerms,
  boliviaCivilDate,
  formatBolivianos,
  FormScrollView,
  Heading,
  InvoiceDataCard,
  invoiceChoiceFrom,
  invoiceDataPayload,
  type InvoiceChoice,
  PrimaryButton,
  radii,
  Screen,
  spacing,
  StartDateChooser,
  surfaces,
  typography,
  useStudioRules,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { BranchChips, useCashBranches } from "../ui/branch-chips";
import { CenteredCard } from "./assistant-layout";
import { useAssistantWorkspace } from "./assistant-workspace";
import { AssistantApiError, createAssistantApi } from "./assistant-api";
import { describeClasses, formatCivilDate, formatCivilDayMonth } from "./assistant-format";
import { ClientBanner } from "./client-banner";
import type { ClientContext } from "./client-overview-screen";
import { FrontDeskReceiptCard, type FrontDeskReceipt } from "./front-desk-receipt-card";

type ConfirmNavigation = {
  goBack: () => void;
  // Back to the overview already in the stack, dropping plan and payment.
  popTo: {
    (screen: "ClientOverview", params: { clientId: string }): void;
    (screen: "ClientSearch"): void;
  };
};

const paymentProblems: Record<string, string> = {
  subscription_not_expired: "La clienta ya tiene un plan activo.",
  purchase_intent_open_exists: "La clienta tiene una compra en curso desde la app.",
  payment_pending_exists: "La clienta tiene un pago en revisión.",
  branch_not_assigned: "Solo puedes registrar pagos en tus sucursales.",
  plan_not_purchasable: "Este plan ya no está disponible.",
  start_date_out_of_window: "Esa fecha de inicio no está disponible.",
  future_subscription_exists: "El cliente ya tiene un plan siguiente.",
};

function Line({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={styles.line}>
      <BodyText style={strong ? styles.lineLabelStrong : styles.lineLabel}>{label}</BodyText>
      <Text style={strong ? styles.lineValueStrong : styles.lineValue}>{value}</Text>
    </View>
  );
}

export function ConfirmCashPaymentScreen({
  route,
}: {
  route: { params: ClientContext & { quote: PlanQuoteDto; renewalStartsOn?: string } };
}) {
  const { clientId, clientName, quote, renewalStartsOn } = route.params;
  const navigation = useNavigation<ConfirmNavigation>();
  const workspace = useAssistantWorkspace();
  const fetcher = useStaffFetcher();
  const queryClient = useQueryClient();
  const api = useMemo(() => createAssistantApi(fetcher), [fetcher]);
  const branches = useCashBranches();
  const branchId = branches.branch?.id ?? null;
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [result, setResult] = useState<AssistantCashPaymentDto | null>(null);
  const studioRules = useStudioRules(fetcher);
  const today = boliviaCivilDate(new Date());
  const [startsOn, setStartsOn] = useState(today);
  const [receipt, setReceipt] = useState<FrontDeskReceipt | null>(null);
  const [receiptPending, setReceiptPending] = useState(false);
  // PAY-007: prefilled from the Client's last sale; a failed read leaves «Sin factura».
  const lastInvoice = useGetAssistantClientInvoiceData(clientId, { fetcher });
  const [invoiceEdit, setInvoiceEdit] = useState<InvoiceChoice | null>(null);
  const invoice =
    invoiceEdit ??
    invoiceChoiceFrom(
      lastInvoice.data?.status === 200 ? (lastInvoice.data.data.invoiceData ?? null) : null,
    );
  const invoiceData = invoiceDataPayload(invoice);

  const photograph = async () => {
    if (branchId === null || receiptPending) return;
    setReceiptPending(true);
    setFailure(null);
    try {
      // Loaded only here: the receipt modules are native, and importing them
      // from the navigation graph crashes every Staff role at startup.
      const { photographTransferReceipt } = await import("./front-desk-receipt-upload");
      const photographed = await photographTransferReceipt(fetcher);
      if (photographed === null) return;
      await api.recordFrontDeskTransfer(
        clientId,
        quote.id,
        branchId,
        photographed.imageAssetId,
        renewalStartsOn === undefined ? startsOn : undefined,
      );
      setReceipt(photographed);
      setFailure("Comprobante enviado. Queda pendiente de revisión.");
    } catch (error) {
      const code = error instanceof AssistantApiError ? error.code : null;
      setFailure(
        (code !== null ? paymentProblems[code] : undefined) ??
          "No pudimos enviar el comprobante. Inténtalo de nuevo.",
      );
    } finally {
      setReceiptPending(false);
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
        renewalStartsOn === undefined ? startsOn : undefined,
        invoiceData,
      );
      await queryClient.invalidateQueries({
        queryKey: getGetAssistantClientOverviewQueryKey(clientId),
      });
      setResult(recorded);
    } catch (error) {
      const code = error instanceof AssistantApiError ? error.code : null;
      setFailure(
        (code !== null ? paymentProblems[code] : undefined) ??
          "No pudimos registrar el pago. Inténtalo de nuevo.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (result !== null) {
    const activated = result.subscription;
    return (
      <Screen style={styles.screen}>
        <CenteredCard maxWidth={520}>
          <View style={styles.success}>
            <View style={styles.successIcon}>
              <Text style={styles.successGlyph}>✓</Text>
            </View>
            <Heading accessibilityLabel="¡Pago registrado!" style={styles.centered}>
              ¡Pago registrado!
            </Heading>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{result.payment.planName}</Text>
              <BodyText>{describeClasses(result.payment.classAllowance)}</BodyText>
              {activated ? (
                <BodyText style={styles.muted}>
                  {`Vence el ${formatCivilDate(activated.endsOn)}`}
                </BodyText>
              ) : null}
              <BodyText style={styles.muted}>
                {`Cobrado en efectivo: ${formatBolivianos(result.payment.amountDueCentavos)}`}
              </BodyText>
            </View>
            <PrimaryButton
              label="Volver al cliente"
              onPress={() => {
                if (workspace.split) {
                  workspace.show({ view: "overview", clientId });
                  navigation.popTo("ClientSearch");
                  return;
                }
                navigation.popTo("ClientOverview", { clientId });
              }}
              testID="cash-back-to-client"
            />
          </View>
        </CenteredCard>
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <CenteredCard maxWidth={520}>
        <BackLink onPress={() => navigation.goBack()} />
        <Heading accessibilityLabel="Confirmar pago en efectivo">
          Confirmar pago en efectivo
        </Heading>
        <ClientBanner action="Registrando pago para" clientName={clientName} />
        <FormScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{quote.name}</Text>
            <BodyText>{describePlanTerms(quote)}</BodyText>
            <Line label="Precio del plan" value={formatBolivianos(quote.priceCentavos)} />
            <View style={styles.divider} />
            {/* Credit is retired (PAY-005): the cash collected is the full price. */}
            <Line
              label="Monto a cobrar en efectivo"
              strong
              value={formatBolivianos(quote.priceCentavos)}
            />
          </View>
          {renewalStartsOn !== undefined ? (
            <BodyText>
              {`El nuevo plan empieza el ${formatCivilDayMonth(renewalStartsOn)}, al terminar el actual.`}
            </BodyText>
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
            label="Sucursal donde recibes el efectivo"
            onSelect={branches.select}
            options={branches.options}
            selectedId={branchId}
            testIDPrefix="cash-branch"
          />
          <InvoiceDataCard
            noInvoiceNote="La venta se registra sin datos de factura."
            onChange={setInvoiceEdit}
            prefilledNote="Datos de su última compra. Confírmalos con la clienta."
            raised
            value={invoice}
          />
          <FrontDeskReceiptCard onPhotograph={() => void photograph()} receipt={receipt} />
          <BodyText style={styles.muted}>
            {`Confirma solo cuando tengas el efectivo en mano. ${
              renewalStartsOn === undefined
                ? "El plan se activa al instante."
                : "El plan queda programado para esa fecha."
            }`}
          </BodyText>
          {failure !== null ? (
            <BodyText accessibilityRole="alert" style={styles.failure}>
              {failure}
            </BodyText>
          ) : null}
          <PrimaryButton
            busy={submitting}
            disabled={branchId === null || invoiceData === "incomplete"}
            label="Confirmar pago recibido"
            onPress={() => void confirm()}
            testID="cash-confirm"
          />
        </FormScrollView>
      </CenteredCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    ...surfaces.card,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  cardTitle: { color: colors.text, fontSize: typography.bodyLarge, fontWeight: "500" },
  centered: { textAlign: "center" },
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  divider: { backgroundColor: colors.border, height: 1 },
  failure: { color: colors.errorText },
  line: { flexDirection: "row", justifyContent: "space-between" },
  lineLabel: { color: colors.textMuted },
  lineLabelStrong: { color: colors.text, fontWeight: "600" },
  lineValue: { color: colors.text, fontSize: typography.body },
  lineValueStrong: { color: colors.text, fontSize: typography.titleSecondary, fontWeight: "600" },
  muted: { color: colors.textMuted, fontSize: typography.note },
  screen: { gap: spacing.md },
  success: { alignItems: "stretch", flex: 1, gap: spacing.lg, justifyContent: "center" },
  successGlyph: { color: colors.white, fontSize: typography.titleSecondary, fontWeight: "600" },
  successIcon: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.successText,
    borderRadius: radii.pill,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
});
