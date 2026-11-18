import { LoadingState, QueryFailure, Screen, spacing, StateScreen } from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { ScrollView, StyleSheet } from "react-native";

import { RootHeader } from "../ui/root-header";
import { useIsTablet } from "../ui/use-is-tablet";
import { OtherPayments } from "./other-payments";
import { PayHistory } from "./pay-history";
import { otherPayments, paySummary } from "./pay-ledger";
import { PaySummaryCard } from "./pay-summary-card";
import { useOwnPay } from "./use-own-pay";

type PayNavigation = {
  navigate: (...args: ["AgendaTab"] | ["PayStatement", { statementId: string }]) => void;
};

// Finding 111, proposal B: what matters now on top, then «Historial» with one
// row per statement, then any payment that has no statement.
export function StaffPayScreen() {
  const navigation = useNavigation<PayNavigation>();
  const tablet = useIsTablet();
  const pay = useOwnPay();

  const header = <RootHeader title="Mis pagos" />;
  if (pay.pending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando tus pagos" />
      </Screen>
    );
  }
  if (pay.loaded === null) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure label="No pudimos cargar tus pagos." onRetry={pay.retry} />
      </Screen>
    );
  }

  const { statements, payments } = pay.loaded;
  if (statements.length === 0 && payments.length === 0) {
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
  const summary = paySummary(statements, payments);
  const others = otherPayments(statements, payments);
  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, tablet && styles.tablet]}
        refreshControl={pay.refreshControl}
      >
        {header}
        {summary === null ? null : <PaySummaryCard summary={summary} />}
        {statements.length === 0 ? null : (
          <PayHistory
            onOpen={(statementId) => navigation.navigate("PayStatement", { statementId })}
            payments={payments}
            statements={statements}
          />
        )}
        {others.length === 0 ? null : <OtherPayments payments={others} />}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingBottom: spacing.xxl },
  screen: { paddingHorizontal: spacing.xlSm },
  tablet: { alignSelf: "center", maxWidth: 560, width: "100%" },
});
