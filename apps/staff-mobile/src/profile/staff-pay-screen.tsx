import {
  getListOwnPayStatementsQueryKey,
  getListOwnSalaryPaymentsQueryKey,
  useListOwnPayStatements,
  useListOwnSalaryPayments,
} from "@pilates/api-contracts";
import {
  colors,
  fontFamilies,
  EmptyState,
  LoadingState,
  QueryFailure,
  Screen,
  ScreenTopBar,
  spacing,
  typography,
  usePullToRefresh,
  useRefetchOnFocus,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { ScrollView, StyleSheet, Text } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { PayStatementCard } from "./pay-statement-card";
import { PaymentsReceived } from "./payments-received";
import { useIsTablet } from "../ui/use-is-tablet";

export function StaffPayScreen() {
  const navigation = useNavigation<{ goBack: () => void }>();
  const fetcher = useStaffFetcher();
  const tablet = useIsTablet();
  const statements = useListOwnPayStatements({ fetcher, query: { refetchOnMount: "always" } });
  const payments = useListOwnSalaryPayments({ fetcher, query: { refetchOnMount: "always" } });
  const queryKeys = [getListOwnPayStatementsQueryKey(), getListOwnSalaryPaymentsQueryKey()];
  useRefetchOnFocus(queryKeys);
  const refreshControl = usePullToRefresh(queryKeys);

  const header = <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Mis pagos" />;
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
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  screen: { gap: spacing.md },
  sectionTitle: {
    color: colors.textSubtle,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.note,
    letterSpacing: 1.7,
    textTransform: "uppercase",
  },
  tablet: { alignSelf: "center", maxWidth: 560, width: "100%" },
});
