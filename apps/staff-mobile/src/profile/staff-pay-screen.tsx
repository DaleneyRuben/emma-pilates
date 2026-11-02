import {
  getListOwnPayStatementsQueryKey,
  getListOwnSalaryPaymentsQueryKey,
  type OwnSalaryPaymentDto,
  type PayStatementDto,
  type PayStatementLineDto,
  useListOwnPayStatements,
  useListOwnSalaryPayments,
} from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  EmptyState,
  formatMonthHeading,
  LoadingState,
  QueryFailure,
  radii,
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
import { formatExactBolivianos } from "../ui/exact-bolivianos";
import { useIsTablet } from "../ui/use-is-tablet";

const lineLabels: Record<PayStatementLineDto["kind"], string> = {
  class: "Clase",
  minimum_not_met: "Clase cancelada por mínimo",
  commission: "Comisión",
  base: "Base",
  new_client: "Clienta nueva",
  bonus: "Bono",
};

// The statement's month is a civil date; noon in Bolivia keeps it in its month.
function monthHeading(month: string): string {
  return formatMonthHeading(`${month}T12:00:00-04:00`);
}

function StatementCard({ statement }: { statement: PayStatementDto }) {
  const heading = monthHeading(statement.month);
  const approved = statement.state === "approved";
  return (
    <View accessibilityLabel={`Liquidación de ${heading.toLowerCase()}`} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          <Text style={styles.month}>{heading}</Text>
          <View style={[styles.state, approved ? styles.approved : styles.draft]}>
            <Text style={approved ? styles.approvedText : styles.draftText}>
              {approved ? "Aprobado" : "Borrador"}
            </Text>
          </View>
        </View>
        <Text style={styles.total}>{formatExactBolivianos(statement.totalCentavos)}</Text>
      </View>
      {approved ? null : (
        <BodyText style={styles.note}>Puede cambiar hasta que administración lo apruebe.</BodyText>
      )}
      <View style={styles.lines}>
        {statement.lines.map((line, index) => (
          // Lines have no identity of their own; their order is the statement's.
          <View key={index} style={styles.line}>
            <View style={styles.lineBody}>
              <Text style={styles.lineLabel}>{lineLabels[line.kind]}</Text>
              <Text style={styles.lineDetail}>{line.detail}</Text>
            </View>
            <Text style={styles.amount}>{formatExactBolivianos(line.amountCentavos)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function PaymentsReceived({ payments }: { payments: OwnSalaryPaymentDto[] }) {
  return (
    <View accessibilityLabel="Pagos recibidos" style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        Pagos recibidos
      </Text>
      <View style={styles.paymentGroup}>
        {payments.map((payment) => (
          <View key={payment.id} style={styles.payment}>
            <BodyText>{formatCivilDate(payment.paidOn)}</BodyText>
            <Text style={styles.amount}>{formatExactBolivianos(payment.amountCentavos)}</Text>
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
          {monthly.map((statement) => (
            <StatementCard key={statement.id} statement={statement} />
          ))}
          {received.length === 0 ? null : <PaymentsReceived payments={received} />}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  amount: { color: colors.text, fontSize: typography.body, fontVariant: ["tabular-nums"] },
  approved: { backgroundColor: colors.successTint },
  approvedText: { color: colors.successText, fontSize: typography.note, fontWeight: "500" },
  card: { ...surfaces.card, gap: spacing.md, padding: spacing.lg },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  cardTitle: { alignItems: "center", flexDirection: "row", flexShrink: 1, gap: spacing.sm },
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  draft: { backgroundColor: colors.warningTint },
  draftText: { color: colors.warningText, fontSize: typography.note, fontWeight: "500" },
  line: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  lineBody: { flexShrink: 1, gap: 2 },
  lineDetail: { color: colors.textMuted, fontSize: typography.note },
  lineLabel: { color: colors.text, fontSize: typography.body },
  lines: { gap: spacing.md },
  month: { color: colors.text, fontSize: typography.bodyLarge, fontWeight: "500" },
  note: { color: colors.textMuted, fontSize: typography.note },
  payment: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  paymentGroup: { ...surfaces.flatCard, overflow: "hidden" },
  screen: { gap: spacing.md },
  section: { gap: spacing.sm, marginTop: spacing.sm },
  sectionTitle: { color: colors.textSubtle, fontSize: typography.note, fontWeight: "600" },
  state: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  tablet: { alignSelf: "center", maxWidth: 560, width: "100%" },
  total: { color: colors.text, fontSize: typography.bodyLarge, fontWeight: "600" },
});
