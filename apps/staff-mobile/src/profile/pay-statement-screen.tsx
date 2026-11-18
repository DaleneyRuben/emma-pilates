import {
  cardWithActionRow,
  colors,
  fontFamilies,
  LoadingState,
  QueryFailure,
  radii,
  Screen,
  SectionTitle,
  spacing,
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

const pills = {
  paid: { label: "Pagado", fill: colors.successTint, text: colors.successText },
  unpaid: { label: "Por pagar", fill: colors.warningTint, text: colors.warningText },
  open: { label: "En curso", fill: colors.primaryTint, text: colors.primaryOnTint },
} as const;

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
  if (pay.loaded === null || statement === undefined) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure label="No pudimos cargar la liquidación." onRetry={pay.retry} />
      </Screen>
    );
  }

  const { heading } = payPeriodHeading(statement);
  const status = statementStatus(statement, pay.loaded.payments);
  const pill = pills[status.kind];
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
              <View style={[styles.pill, { backgroundColor: pill.fill }]}>
                <Text style={[styles.pillText, { color: pill.text }]}>{pill.label}</Text>
              </View>
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
  pill: { borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  pillText: { fontFamily: fontFamilies.bodyMedium, fontSize: typography.note },
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
