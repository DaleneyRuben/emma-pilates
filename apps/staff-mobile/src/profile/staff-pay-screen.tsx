import {
  getListOwnPayStatementsQueryKey,
  getListOwnSalaryPaymentsQueryKey,
  type OwnSalaryPaymentDto,
  useListOwnPayStatements,
  useListOwnSalaryPayments,
} from "@pilates/api-contracts";
import {
  colors,
  EmptyState,
  LoadingState,
  QueryFailure,
  Screen,
  ScreenTopBar,
  spacing,
  surfaces,
  typography,
  usePullToRefresh,
  useRefetchOnFocus,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { formatCivilDate } from "../assistant/assistant-format";
import { useStaffFetcher } from "../staff-fetcher";
import { PayStatementCard } from "./pay-statement-card";
import { formatExactBolivianos } from "../ui/exact-bolivianos";
import { useIsTablet } from "../ui/use-is-tablet";

function PaymentsReceived({ payments }: { payments: OwnSalaryPaymentDto[] }) {
  return (
    <View accessibilityLabel="Pagos recibidos" style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        Pagos recibidos
      </Text>
      <View style={styles.paymentGroup}>
        {payments.map((payment, index) => (
          <View key={payment.id} style={[styles.payment, index > 0 && styles.paymentDivider]}>
            <Text style={styles.amount}>{formatExactBolivianos(payment.amountCentavos)}</Text>
            <Text style={styles.date}>{formatCivilDate(payment.paidOn)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function StaffPayScreen() {
  const navigation = useNavigation<{ goBack: () => void }>();
  const fetcher = useStaffFetcher();
  const tablet = useIsTablet();
  const statements = useListOwnPayStatements({ fetcher, query: { refetchOnMount: "always" } });
  const payments = useListOwnSalaryPayments({ fetcher, query: { refetchOnMount: "always" } });
  const queryKeys = [getListOwnPayStatementsQueryKey(), getListOwnSalaryPaymentsQueryKey()];
  useRefetchOnFocus(queryKeys);
  const refreshControl = usePullToRefresh(queryKeys);

  const header = <ScreenTopBar onBack={() => navigation.goBack()} title="Mis pagos" />;
  if (statements.isPending || payments.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando tus pagos" />
      </Screen>
    );
  }
  if (statements.data?.status !== 200 || payments.data?.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure
          label="No pudimos cargar tus pagos."
          onRetry={() => {
            void statements.refetch();
            void payments.refetch();
          }}
        />
      </Screen>
    );
  }

  const monthly = statements.data.data;
  const received = payments.data.data;
  return (
    <Screen style={styles.screen}>
      {header}
      {monthly.length === 0 && received.length === 0 ? (
        <EmptyState
          icon="card"
          message="Aquí verás cada mes lo que te corresponde y lo que se te pagó."
          title="Todavía no tienes pagos."
          variant="plain"
        />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, tablet && styles.tablet]}
          refreshControl={refreshControl}
        >
          {monthly.length === 0 ? null : (
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Liquidaciones
            </Text>
          )}
          {monthly.map((statement) => (
            <PayStatementCard key={statement.id} statement={statement} />
          ))}
          {received.length === 0 ? null : <PaymentsReceived payments={received} />}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  amount: { color: colors.text, fontSize: typography.body, fontVariant: ["tabular-nums"] },
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  date: { color: colors.textMuted, fontSize: typography.note },
  payment: {
    gap: 2,
    justifyContent: "center",
    minHeight: 68,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  paymentDivider: { borderTopColor: colors.border, borderTopWidth: 1 },
  paymentGroup: { ...surfaces.flatCard, overflow: "hidden" },
  screen: { gap: spacing.md },
  section: { gap: spacing.sm, marginTop: spacing.sm },
  sectionTitle: {
    color: colors.textSubtle,
    fontSize: typography.note,
    fontWeight: "500",
    letterSpacing: 1.7,
    textTransform: "uppercase",
  },
  tablet: { alignSelf: "center", maxWidth: 560, width: "100%" },
});
