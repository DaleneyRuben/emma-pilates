import { useListPendingPayments } from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  formatBolivianos,
  formatNotificationTime,
  initials,
  QueryFailure,
  radii,
  Screen,
  spacing,
  surfaces,
  TextButton,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { RootHeader } from "../ui/root-header";

export type PaymentsNotice = "Pago confirmado" | "Pago rechazado";

type PendingPaymentsNavigation = {
  navigate: (
    screen: "ReviewPayment" | "CancelClass",
    params?: { paymentId: string },
  ) => void;
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
  const [notice, setNotice] = useState<PaymentsNotice | null>(null);
  const incomingNotice = route.params?.notice;

  // Confirming or rejecting returns here with a two-second notice.
  useEffect(() => {
    if (incomingNotice === undefined) return;
    setNotice(incomingNotice);
    navigation.setParams({ notice: undefined });
    const timer = setTimeout(() => setNotice(null), noticeMilliseconds);
    return () => clearTimeout(timer);
  }, [incomingNotice, navigation]);

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
        <BodyText accessibilityLabel="Cargando pagos">Cargando…</BodyText>
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
  const total = payments.reduce(
    (sum, payment) => sum + payment.amountDueCentavos,
    0,
  );
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
                onPress={() =>
                  navigation.navigate("ReviewPayment", { paymentId: payment.id })
                }
                style={styles.card}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(payment.clientName)}</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.name}>{payment.clientName}</Text>
                  <BodyText>{payment.planName}</BodyText>
                </View>
                <View style={styles.cardTrailing}>
                  <Text style={styles.amount}>
                    {formatBolivianos(payment.amountDueCentavos)}
                  </Text>
                  <BodyText style={styles.ago}>
                    {formatNotificationTime(payment.submittedAt, now)}
                  </BodyText>
                </View>
              </Pressable>
            ))}
          </>
        )}
        <TextButton
          label="Cancelar una clase"
          onPress={() => navigation.navigate("CancelClass")}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  ago: { color: colors.textMuted, fontSize: typography.note },
  amount: {
    color: colors.text,
    fontFamily: "Lora_500Medium",
    fontSize: typography.bodyLarge,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  avatarText: {
    color: colors.primaryOnTint,
    fontSize: typography.note,
    fontWeight: "600",
  },
  card: {
    ...surfaces.card,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
  },
  cardBody: { flex: 1, gap: spacing.xxs },
  cardTrailing: { alignItems: "flex-end", gap: spacing.xxs },
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
  name: { color: colors.text, fontSize: typography.body, fontWeight: "500" },
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
