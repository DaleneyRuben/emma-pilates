import {
  getListOwnPayStatementsQueryKey,
  getListOwnSalaryPaymentsQueryKey,
  useListOwnPayStatements,
  useListOwnSalaryPayments,
} from "@pilates/api-contracts";
import {
  LoadingState,
  QueryFailure,
  Screen,
  SectionTitle,
  spacing,
  StateScreen,
  usePullToRefresh,
  useRefetchOnFocus,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { ScrollView, StyleSheet, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { RootHeader } from "../ui/root-header";
import { DraftStatementCard, PayStatementCard } from "./pay-statement-card";
import { PaymentsReceived } from "./payments-received";
import { useIsTablet } from "../ui/use-is-tablet";

export function StaffPayScreen() {
  const navigation = useNavigation<{ navigate: (screen: "AgendaTab") => void }>();
  const fetcher = useStaffFetcher();
  const tablet = useIsTablet();
  const statements = useListOwnPayStatements({ fetcher, query: { refetchOnMount: "always" } });
  const payments = useListOwnSalaryPayments({ fetcher, query: { refetchOnMount: "always" } });
  const queryKeys = [getListOwnPayStatementsQueryKey(), getListOwnSalaryPaymentsQueryKey()];
  useRefetchOnFocus(queryKeys);
  const refreshControl = usePullToRefresh(queryKeys);

  const header = <RootHeader title="Mis pagos" />;
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
  if (monthly.length === 0 && received.length === 0) {
    return (
      <Screen style={styles.screen}>
        {header}
        <StateScreen
          icon="card"
          note="Aquí verás cada mes lo que te corresponde por tus clases y lo que se te pagó."
          primaryAction={{
            label: "Ver mi agenda",
            onPress: () => navigation.navigate("AgendaTab"),
          }}
          title="Todavía no tienes pagos"
        />
      </Screen>
    );
  }
  // v2 S29: the open month is the hero; the approved ones follow.
  const draft = monthly[0]?.state === "draft" ? monthly[0] : undefined;
  const earlier = draft === undefined ? monthly : monthly.slice(1);
  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, tablet && styles.tablet]}
        refreshControl={refreshControl}
      >
        {header}
        {draft === undefined ? null : <DraftStatementCard statement={draft} />}
        {earlier.length === 0 ? null : (
          <View>
            <SectionTitle>
              {draft === undefined ? "Liquidaciones" : "Liquidaciones anteriores"}
            </SectionTitle>
            <View style={styles.cards}>
              {earlier.map((statement) => (
                <PayStatementCard key={statement.id} statement={statement} />
              ))}
            </View>
          </View>
        )}
        {received.length === 0 ? null : <PaymentsReceived payments={received} />}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cards: { gap: spacing.md },
  content: { gap: spacing.xl, paddingBottom: spacing.xxl },
  screen: { paddingHorizontal: spacing.xlSm },
  tablet: { alignSelf: "center", maxWidth: 560, width: "100%" },
});
