import {
  cardWithActionRow,
  colors,
  fontFamilies,
  LoadingState,
  QueryFailure,
  Screen,
  SectionTitle,
  spacing,
  StateScreen,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { BackBar, backBarScroll } from "../ui/back-bar";
import { formatExactBolivianos } from "../ui/exact-bolivianos";
import { useIsTablet } from "../ui/use-is-tablet";
import { statementStatus } from "./pay-ledger";
import { payPeriodHeading } from "./pay-period-heading";
import { PaymentStrip, StatementBreakdown } from "./pay-statement-card";
import { useReceiptViewer } from "./receipt-viewer";
import { useOwnPay } from "./use-own-pay";

// FIX-089: the state is a word in weight; palette B keeps pills for exceptions.
const stateWords = { paid: "Pagado", unpaid: "Por pagar", open: "En curso" } as const;

// Finding 111, proposal B: one statement, opened from «Historial». It reads
// the same lists as «Mis pagos», so it opens from the cache.
export function PayStatementScreen({ route }: { route: { params: { statementId: string } } }) {
  const navigation = useNavigation();
  const tablet = useIsTablet();
  const pay = useOwnPay();
  const receipts = useReceiptViewer();

  const header = <BackBar back="Mis pagos" onBack={() => navigation.goBack()} />;
  if (pay.pending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando la liquidación" />
      </Screen>
    );
  }
  const statement = pay.loaded?.statements.find(
    (candidate) => candidate.id === route.params.statementId,
  );
  if (pay.loaded === null) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure label="No pudimos cargar la liquidación." onRetry={pay.retry} />
      </Screen>
    );
  }

  if (statement === undefined) {
    return (
      <Screen style={styles.screen}>
        {header}
        <StateScreen
          icon="card"
          note="Puede que administración la haya vuelto a calcular."
          primaryAction={{ label: "Volver a Mis pagos", onPress: () => navigation.goBack() }}
          title="Esta liquidación ya no está"
        />
      </Screen>
    );
  }

  const { heading } = payPeriodHeading(statement);
  const status = statementStatus(statement, pay.loaded.payments);
  const stateWord = stateWords[status.kind];
  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={[backBarScroll.content, styles.content, tablet && styles.tablet]}
        refreshControl={pay.refreshControl}
        style={backBarScroll.scroll}
      >
        {header}
        <View style={styles.body} testID="pay-statement">
          <View style={styles.titles}>
            <SectionTitle>
              {status.kind === "open" ? "Periodo en curso" : "Liquidación"}
            </SectionTitle>
            <Text accessibilityRole="header" style={styles.heading}>
              {heading}
            </Text>
          </View>
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.state}>{stateWord}</Text>
            </View>
            <Text style={styles.total}>{formatExactBolivianos(statement.totalCentavos)}</Text>
            <PaymentStrip onReceipt={receipts.show} status={status} />
            {receipts.error}
            <StatementBreakdown statement={statement} />
          </View>
        </View>
      </ScrollView>
      {receipts.viewer}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg },
  card: { ...surfaces.card, ...cardWithActionRow, gap: spacing.md, padding: spacing.lg },
  cardTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  heading: { color: colors.text, fontFamily: fontFamilies.display, fontSize: 26, lineHeight: 32 },
  state: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.body,
    fontWeight: "600",
  },
  screen: { paddingHorizontal: spacing.xlSm },
  tablet: { alignSelf: "center", maxWidth: 560, width: "100%" },
  titles: { gap: spacing.xs },
  total: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: 34,
    fontVariant: ["tabular-nums"],
    lineHeight: 40,
    marginTop: -spacing.xs,
  },
  totalLabel: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.body },
});
