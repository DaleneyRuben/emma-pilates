import {
  IconRowGroup,
  LoadingState,
  QueryFailure,
  Screen,
  spacing,
  StateScreen,
  useMobileIdentity,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { ScrollView, StyleSheet } from "react-native";

import { bodyScroll } from "../ui/card-pieces";
import { BackBar } from "../ui/back-bar";
import { RootHeader } from "../ui/root-header";
import { useIsStackRoot } from "../ui/use-is-stack-root";
import { useIsTablet } from "../ui/use-is-tablet";
import { OtherPayments } from "./other-payments";
import { PayHistory } from "./pay-history";
import { otherPayments, paySummary } from "./pay-ledger";
import { PaySummaryCard } from "./pay-summary-card";
import { PayoutQrRow } from "./payout-qr/payout-qr-row";
import { useOwnPay } from "./use-own-pay";

type PayNavigation = {
  goBack: () => void;
  navigate: (
    ...args: ["AgendaTab"] | ["PayoutQr"] | ["PayStatement", { statementId: string }]
  ) => void;
};

// Finding 111, proposal B: what matters now on top, then «Historial» with one
// row per statement, then any payment that has no statement. E8 (ADR-0111):
// a tab for the Trainer, the Coordinator and the Nutritionist, with «Mi QR de
// cobro» last; the Assistant opens it from Perfil, where her QR already is.
export function StaffPayScreen() {
  const navigation = useNavigation<PayNavigation>();
  const tablet = useIsTablet();
  const pay = useOwnPay();
  const tab = useIsStackRoot();
  const role = useMobileIdentity().session?.role;
  // Only the Trainer and the Nutritionist have an agenda to go back to.
  const agenda = role === "trainer" || role === "nutritionist";

  const header = tab ? (
    <RootHeader title="Mis pagos" />
  ) : (
    <BackBar onBack={() => navigation.goBack()} title="Mis pagos" />
  );
  const qrRow = tab ? (
    <IconRowGroup>
      <PayoutQrRow label="Mi QR de cobro" onPress={() => navigation.navigate("PayoutQr")} />
    </IconRowGroup>
  ) : null;
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
        <ScrollView
          contentContainerStyle={[bodyScroll.content, tablet && styles.tablet]}
          style={bodyScroll.scroll}
        >
          <StateScreen
            icon="card"
            layout="card"
            note={
              role === "trainer"
                ? "Aquí verás cada mes lo que te corresponde por tus clases y lo que se te pagó."
                : "Aquí verás cada mes lo que te corresponde y lo que se te pagó."
            }
            primaryAction={
              agenda
                ? { label: "Ver mi agenda", onPress: () => navigation.navigate("AgendaTab") }
                : undefined
            }
            title="Todavía no tienes pagos"
          />
          {qrRow}
        </ScrollView>
      </Screen>
    );
  }
  const summary = paySummary(statements, payments);
  const others = otherPayments(statements, payments);
  return (
    <Screen style={styles.screen}>
      {header}
      <ScrollView
        contentContainerStyle={[bodyScroll.content, tablet && styles.tablet]}
        refreshControl={pay.refreshControl}
        style={bodyScroll.scroll}
      >
        {summary === null ? null : <PaySummaryCard summary={summary} />}
        {statements.length === 0 ? null : (
          <PayHistory
            onOpen={(statementId) => navigation.navigate("PayStatement", { statementId })}
            payments={payments}
            statements={statements}
          />
        )}
        {others.length === 0 ? null : (
          <OtherPayments
            payments={others}
            title={statements.length === 0 ? "Pagos" : "Otros pagos"}
          />
        )}
        {qrRow}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: spacing.lg },
  tablet: { alignSelf: "center", maxWidth: 560, width: "100%" },
});
