import {
  getGetAssistantClientOverviewQueryKey,
  useGetCurrentStaffMemberProfile,
  useListBranches,
  type AssistantCashPaymentDto,
  type PlanQuoteDto,
} from "@pilates/api-contracts";
import {
  BackLink,
  BodyText,
  colors,
  formatBolivianos,
  Heading,
  PrimaryButton,
  radii,
  Screen,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { CenteredCard } from "./assistant-layout";
import { useAssistantWorkspace } from "./assistant-workspace";
import { AssistantApiError, createAssistantApi } from "./assistant-api";
import { describeClasses, formatCivilDate } from "./assistant-format";
import { ClientBanner } from "./client-banner";
import type { ClientContext } from "./client-overview-screen";

type ConfirmNavigation = {
  goBack: () => void;
  // Back to the overview already in the stack, dropping plan and payment.
  popTo: {
    (screen: "ClientOverview", params: { clientId: string }): void;
    (screen: "ClientSearch"): void;
  };
};

const paymentProblems: Record<string, string> = {
  subscription_not_expired: "El cliente ya tiene un plan activo.",
  purchase_intent_open_exists: "El cliente tiene una compra en curso desde la app.",
  payment_pending_exists: "El cliente tiene un pago en revisión.",
  branch_not_assigned: "Solo puedes registrar pagos en tus sucursales.",
  plan_not_purchasable: "Este plan ya no está disponible.",
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
  route: { params: ClientContext & { quote: PlanQuoteDto } };
}) {
  const { clientId, clientName, quote } = route.params;
  const navigation = useNavigation<ConfirmNavigation>();
  const workspace = useAssistantWorkspace();
  const fetcher = useStaffFetcher();
  const queryClient = useQueryClient();
  const api = useMemo(() => createAssistantApi(fetcher), [fetcher]);
  const profile = useGetCurrentStaffMemberProfile({ fetcher });
  const assigned = profile.data?.status === 200 ? profile.data.data.branches : [];
  // Administrators have no assignments and choose among every Branch.
  const branches = useListBranches({
    fetcher,
    query: { enabled: profile.data?.status === 200 && assigned.length === 0 },
  });
  const options =
    assigned.length > 0 ? assigned : branches.data?.status === 200 ? branches.data.data : [];
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const branchId = selectedBranchId ?? options[0]?.id ?? null;
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [result, setResult] = useState<AssistantCashPaymentDto | null>(null);

  const confirm = async () => {
    if (branchId === null) return;
    setSubmitting(true);
    setFailure(null);
    try {
      const recorded = await api.recordCashPayment(clientId, quote.id, branchId);
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
                  {`Válido hasta el ${formatCivilDate(activated.endsOn)}`}
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
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{quote.name}</Text>
            <Line label="Precio del plan" value={formatBolivianos(quote.priceCentavos)} />
            {quote.creditAppliedCentavos > 0 ? (
              <Line
                label="Crédito aplicado"
                value={formatBolivianos(quote.creditAppliedCentavos)}
              />
            ) : null}
            <View style={styles.divider} />
            <Line
              label="Monto a cobrar en efectivo"
              strong
              value={formatBolivianos(quote.amountDueCentavos)}
            />
          </View>
          {options.length > 1 ? (
            <View style={styles.branches}>
              <BodyText style={styles.muted}>Sucursal donde recibes el efectivo</BodyText>
              <View style={styles.chips}>
                {options.map((branch) => {
                  const selected = branch.id === branchId;
                  return (
                    <Pressable
                      accessibilityLabel={branch.name}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={branch.id}
                      onPress={() => setSelectedBranchId(branch.id)}
                      style={[styles.chip, selected && styles.chipSelected]}
                      testID={`cash-branch-${branch.id}`}
                    >
                      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                        {branch.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
          <BodyText style={styles.muted}>
            Confirma solo cuando tengas el efectivo en mano. El plan se activa al instante.
          </BodyText>
          {failure !== null ? (
            <BodyText accessibilityRole="alert" style={styles.failure}>
              {failure}
            </BodyText>
          ) : null}
          <PrimaryButton
            busy={submitting}
            disabled={branchId === null}
            label="Confirmar pago recibido"
            onPress={() => void confirm()}
            testID="cash-confirm"
          />
        </ScrollView>
      </CenteredCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  branches: { gap: spacing.sm },
  card: {
    ...surfaces.card,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  cardTitle: { color: colors.text, fontSize: typography.bodyLarge, fontWeight: "500" },
  centered: { textAlign: "center" },
  chip: {
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipLabel: { color: colors.textSecondary, fontSize: typography.note },
  chipLabelSelected: { color: colors.white },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
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
