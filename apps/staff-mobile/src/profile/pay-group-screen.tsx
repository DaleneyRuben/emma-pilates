import { formatMoney } from "@pilates/api-contracts";
import {
  ClassList,
  ClassRow,
  colors,
  fontFamilies,
  Screen,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { BackBar, backBarScroll } from "../ui/back-bar";
import { useIsTablet } from "../ui/use-is-tablet";
import { groupSummary, type PayGroupKey, payGroups } from "./pay-groups";
import { linesByDay, type UndatedPayLine } from "./pay-line-days";
import { payPeriodHeading } from "./pay-period-heading";
import { StatementGate } from "./statement-gate";
import { useOwnPay } from "./use-own-pay";

export type PayGroupParams = { statementId: string; group: PayGroupKey };

function UndatedRows({ lines }: { lines: UndatedPayLine[] }) {
  return (
    <View style={styles.group}>
      {lines.map((line, index) => (
        // Lines have no identity of their own; their order is the statement's.
        <View key={index} style={[styles.row, index > 0 && styles.divider]}>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>{line.title}</Text>
            {line.note === null ? null : <Text style={styles.note}>{line.note}</Text>}
          </View>
          <Text style={styles.amount}>{formatMoney(line.amountCentavos)}</Text>
        </View>
      ))}
    </View>
  );
}

// E2 C: one concept of a statement by day, each day with its count and sum,
// each class with its hour, type, Branch and amount.
export function PayGroupScreen({ route }: { route: { params: PayGroupParams } }) {
  const navigation = useNavigation();
  const tablet = useIsTablet();
  const pay = useOwnPay();
  const back = <BackBar back="Liquidación" onBack={() => navigation.goBack()} />;

  return (
    <StatementGate header={back} pay={pay} statementId={route.params.statementId}>
      {(statement) => {
        const group = payGroups(statement.lines).find(
          (candidate) => candidate.key === route.params.group,
        );
        const { days, undated } = linesByDay(group?.lines ?? []);
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
              {back}
              <View style={styles.body} testID="pay-group">
                <View style={styles.titles}>
                  <Text style={styles.period}>{payPeriodHeading(statement).heading}</Text>
                  <Text accessibilityRole="header" style={styles.heading}>
                    {group?.label ?? "Sin líneas"}
                  </Text>
                  {group === undefined ? null : (
                    <Text style={styles.summary}>{groupSummary(group)}</Text>
                  )}
                </View>
                {days.map((day) => (
                  <View key={day.title} style={styles.day}>
                    <View style={styles.dayTop}>
                      <Text accessibilityRole="header" style={styles.dayTitle}>
                        {day.title}
                      </Text>
                      <Text style={styles.dayTotal}>
                        {`${day.lines.length} · ${formatMoney(day.centavos)}`}
                      </Text>
                    </View>
                    <ClassList testID="pay-day">
                      {day.lines.map((line, index) => (
                        <ClassRow
                          detail={
                            line.extra === null ? line.branch : `${line.branch} · ${line.extra}`
                          }
                          key={index}
                          places={formatMoney(line.amountCentavos)}
                          time={line.time}
                          title={line.classType}
                        />
                      ))}
                    </ClassList>
                  </View>
                ))}
                {undated.length === 0 ? null : <UndatedRows lines={undated} />}
              </View>
            </ScrollView>
          </Screen>
        );
      }}
    </StatementGate>
  );
}

const styles = StyleSheet.create({
  amount: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.body,
    fontVariant: ["tabular-nums"],
    fontWeight: "600",
  },
  body: { gap: spacing.lg },
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  day: { gap: spacing.sm },
  dayTitle: {
    color: colors.text,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.label,
    fontWeight: "500",
    letterSpacing: typography.label * 0.12,
    textTransform: "uppercase",
  },
  dayTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  dayTotal: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.label,
    fontVariant: ["tabular-nums"],
    fontWeight: "600",
  },
  divider: { borderTopColor: colors.hairline, borderTopWidth: 1 },
  group: { ...surfaces.flatCard, overflow: "hidden" },
  heading: { color: colors.text, fontFamily: fontFamilies.display, fontSize: 26, lineHeight: 32 },
  note: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  period: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 60,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { color: colors.text, fontFamily: fontFamilies.bodyMedium, fontSize: 15 },
  screen: { paddingHorizontal: spacing.xlSm },
  summary: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 14, lineHeight: 21 },
  tablet: { alignSelf: "center", maxWidth: 560, width: "100%" },
  titles: { gap: spacing.xs },
});
