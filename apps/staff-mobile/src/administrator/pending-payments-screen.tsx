import { useListPendingPayments } from "@pilates/api-contracts";
import {
  AvatarCircle,
  BodyText,
  CardFooter,
  Chevron,
  colors,
  DetailLine,
  fontFamilies,
  formatBolivianos,
  formatNotificationTime,
  LoadingState,
  QueryFailure,
  radii,
  Screen,
  spacing,
  surfaces,
  TextButton,
  typography,
  useTransientNotice,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { RootHeader } from "../ui/root-header";

export type PaymentsNotice = "Pago confirmado" | "Pago rechazado";

type PendingPaymentsNavigation = {
  navigate: (screen: "ReviewPayment" | "CancelClass", params?: { paymentId: string }) => void;
  setParams: (params: { notice?: PaymentsNotice }) => void;
};

const noticeMilliseconds = 2_000;

export function PendingPaymentsScreen({
  route,
}: {
  route: { params?: { notice?: PaymentsNotice } };
}) {
  const navigation = useNavigation<PendingPaymentsNavigation>();
  const fetcher = useStaffFetcher();
  const pending = useListPendingPayments({
    fetcher,
    query: { refetchOnMount: "always" },
  });
  // Confirming or rejecting returns here with a two-second notice.
  const notice = useTransientNotice(route.params?.notice, noticeMilliseconds, () =>
    navigation.setParams({ notice: undefined }),
  );

  const header = (
    <>
      <RootHeader label="Pagos pendientes" title="Pagos pendientes" />
      {notice === null ? null : (
        <View accessibilityRole="alert" style={styles.notice}>
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      )}
    </>
  );

  if (pending.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando pagos" />
      </Screen>
    );
  }
  if (pending.isError || pending.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure
          label="No pudimos cargar los pagos pendientes."
          onRetry={() => void pending.refetch()}
        />
      </Screen>
    );
  }

  const payments = pending.data.data;
  const total = payments.reduce((sum, payment) => sum + payment.amountDueCentavos, 0);
  const now = new Date();

  return (
    <Screen style={styles.screen}>
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        {payments.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No hay pagos pendientes.</Text>
            <BodyText style={styles.centered}>
              Todo al día. Te avisaremos cuando llegue una transferencia nueva.
            </BodyText>
          </View>
        ) : (
          <>
            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Por confirmar</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{String(payments.length)}</Text>
                </View>
              </View>
              <BodyText>{`${formatBolivianos(total)} en total`}</BodyText>
            </View>
            {payments.map((payment) => (
              <Pressable
                accessibilityLabel={`Revisar pago de ${payment.clientName}`}
                accessibilityRole="button"
                key={payment.id}
                onPress={() => navigation.navigate("ReviewPayment", { paymentId: payment.id })}
                style={styles.card}
                testID={`pending-payment-${payment.id}`}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.identity}>
                    <AvatarCircle fontSize={17} name={payment.clientName} size={44} />
                    <View style={styles.cardBody}>
                      <Text style={styles.name}>{payment.clientName}</Text>
                      <Text style={styles.plan}>{payment.planName}</Text>
                    </View>
                  </View>
                  <Chevron />
                </View>
                <CardFooter paddingTop={13}>
                  <Text style={styles.amount}>{formatBolivianos(payment.amountDueCentavos)}</Text>
                  <DetailLine
                    icon="clock"
                    iconColor={colors.warning}
                    iconSize={15}
                    style={styles.ago}
                  >
                    {formatNotificationTime(payment.submittedAt, now)}
                  </DetailLine>
                </CardFooter>
              </Pressable>
            ))}
          </>
        )}
        <TextButton
          label="Cancelar una clase"
          onPress={() => navigation.navigate("CancelClass")}
          testID="pending-payments-cancel-class"
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  ago: { color: colors.textMuted, fontSize: typography.note },
  amount: {
    color: colors.text,
    fontFamily: fontFamilies.heading,
    fontSize: typography.titleCard,
    fontVariant: ["tabular-nums"],
  },
  // S11's payment card (MOB-042): the avatar and the Lora name beside the
  // chevron, then the amount and the amber clock under a rule.
  card: { ...surfaces.card, gap: spacing.mdLg, padding: spacing.lgXl },
  cardBody: { flexShrink: 1, gap: spacing.xs },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  identity: { alignItems: "center", flexDirection: "row", flexShrink: 1, gap: 13 },
  name: { color: colors.text, fontFamily: fontFamilies.heading, fontSize: typography.titleSmall },
  plan: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  centered: { textAlign: "center" },
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  countBadge: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    justifyContent: "center",
    minWidth: 24,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  countText: { color: colors.white, fontSize: typography.note, fontWeight: "600" },
  empty: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xxxl },
  emptyTitle: {
    color: colors.text,
    fontSize: typography.bodyLarge,
    fontWeight: "500",
    textAlign: "center",
  },
  notice: {
    alignItems: "center",
    backgroundColor: colors.success,
    borderRadius: radii.control,
    paddingVertical: spacing.smLg,
  },
  noticeText: { color: colors.white, fontSize: typography.body, fontWeight: "500" },
  screen: { gap: spacing.md },
  summary: { gap: spacing.xxs, paddingVertical: spacing.sm },
  summaryLabel: {
    color: colors.text,
    fontSize: typography.titleSecondary,
    fontFamily: "Lora_500Medium",
  },
  summaryRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
});
