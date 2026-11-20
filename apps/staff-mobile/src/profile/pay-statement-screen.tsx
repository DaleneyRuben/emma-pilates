import { formatMoney } from "@pilates/api-contracts";
import {
  colors,
  EmphasisCard,
  fontFamilies,
  Screen,
  SectionTitle,
  spacing,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { BackBar, backBarScroll } from "../ui/back-bar";
import { useIsTablet } from "../ui/use-is-tablet";
import { PayGroupRows } from "./pay-group-rows";
import type { PayGroupKey } from "./pay-groups";
import { payGroups } from "./pay-groups";
import { statementStatus, totalStateLine } from "./pay-ledger";
import { payPeriodHeading } from "./pay-period-heading";
import { PaymentStrip } from "./pay-statement-card";
import { StatementGate } from "./statement-gate";
import { useReceiptViewer } from "./receipt-viewer";
import { useOwnPay } from "./use-own-pay";

type StatementNavigation = {
  goBack: () => void;
  navigate: (screen: "PayGroup", params: { statementId: string; group: PayGroupKey }) => void;
};

// Finding 111 and E2 B: one statement, opened from «Historial». The total and
// its state lead in Palo de rosa; each concept is a row that opens by day.
export function PayStatementScreen({ route }: { route: { params: { statementId: string } } }) {
  const navigation = useNavigation<StatementNavigation>();
  const tablet = useIsTablet();
  const pay = useOwnPay();
  const receipts = useReceiptViewer();

  const header = <BackBar back="Mis pagos" onBack={() => navigation.goBack()} />;
  return (
    <StatementGate header={header} pay={pay} statementId={route.params.statementId}>
      {(statement, payments) => {
        const { heading } = payPeriodHeading(statement);
        const status = statementStatus(statement, payments);
        return (
          <Screen style={styles.screen}>
            <ScrollView
              contentContainerStyle={[
                backBarScroll.content,
                styles.content,
                tablet && styles.tablet,
              ]}
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
                <EmphasisCard eyebrow="Total" testID="pay-statement-total">
                  <Text style={styles.total}>{formatMoney(statement.totalCentavos)}</Text>
                  <Text style={styles.state}>{totalStateLine(statement, status)}</Text>
                </EmphasisCard>
                <PaymentStrip onReceipt={receipts.show} status={status} />
                {receipts.error}
                <PayGroupRows
                  groups={payGroups(statement.lines)}
                  onOpen={(group) =>
                    navigation.navigate("PayGroup", { statementId: statement.id, group })
                  }
                />
              </View>
            </ScrollView>
            {receipts.viewer}
          </Screen>
        );
      }}
    </StatementGate>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg },
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  heading: { color: colors.text, fontFamily: fontFamilies.display, fontSize: 26, lineHeight: 32 },
  screen: { paddingHorizontal: spacing.xlSm },
  state: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 14,
    fontWeight: "600",
    marginTop: -spacing.xs,
  },
  tablet: { alignSelf: "center", maxWidth: 560, width: "100%" },
  titles: { gap: spacing.xs },
  total: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.display,
    fontSize: 36,
    fontVariant: ["tabular-nums"],
    lineHeight: 42,
  },
});
