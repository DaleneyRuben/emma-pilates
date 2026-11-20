import { formatMoney } from "@pilates/api-contracts";
import {
  ClassList,
  ClassRow,
  colors,
  fontFamilies,
  Screen,
  ScreenHeader,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { BackBar } from "../ui/back-bar";
import { bodyScroll, CardLabel, RowCard } from "./card-pieces";
import { useIsTablet } from "../ui/use-is-tablet";
import { groupSummary, type PayGroupKey, payGroups } from "./pay-groups";
import { linesByDay, type UndatedPayLine } from "./pay-line-days";
import { payPeriodHeading } from "./pay-period-heading";
import { StatementGate } from "./statement-gate";
import { useOwnPay } from "./use-own-pay";

export type PayGroupParams = { statementId: string; group: PayGroupKey };

// «54 × Bs 25» for a row that stands for several identical lines.
function undatedNote(line: UndatedPayLine): string | null {
  const times = line.count > 1 ? `${line.count} × ${formatMoney(line.unitCentavos)}` : null;
  return [line.note, times].filter((part) => part !== null).join(" · ") || null;
}

function UndatedRows({ lines }: { lines: UndatedPayLine[] }) {
  return (
    <RowCard>
      {lines.map((line, index) => (
        // Lines have no identity of their own; their order is the statement's.
        <View key={index} style={styles.row}>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>{line.title}</Text>
            {undatedNote(line) === null ? null : (
              <Text style={styles.note}>{undatedNote(line)}</Text>
            )}
          </View>
          <Text style={styles.amount}>{formatMoney(line.amountCentavos)}</Text>
        </View>
      ))}
    </RowCard>
  );
}

// E2 C (E-M07): one concept of a statement by day. The band carries the
// period, the concept and its summary; each day is a white strip with its
// count and sum over its class rows (hour, type, Branch and amount).
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
            <View style={styles.body} testID="pay-group">
              <ScreenHeader
                eyebrow={payPeriodHeading(statement).heading}
                onBack={() => navigation.goBack()}
                subtitle={group === undefined ? undefined : groupSummary(group)}
                title={group?.label ?? "Sin líneas"}
              />
              <ScrollView
                contentContainerStyle={[
                  bodyScroll.content,
                  styles.content,
                  tablet && styles.tablet,
                ]}
                refreshControl={pay.refreshControl}
                style={bodyScroll.scroll}
              >
                {days.map((day) => (
                  <View key={day.title} style={styles.day}>
                    <View style={styles.dayStrip}>
                      <CardLabel end={`${day.lines.length} · ${formatMoney(day.centavos)}`}>
                        {day.title}
                      </CardLabel>
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
              </ScrollView>
            </View>
          </Screen>
        );
      }}
    </StatementGate>
  );
}

const styles = StyleSheet.create({
  amount: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.body,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  body: { flex: 1 },
  content: { gap: spacing.sm },
  day: { gap: spacing.sm },
  // E-M07: the day's heading is a white strip of its own.
  dayStrip: { ...surfaces.card, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  note: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 60,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.bodyMedium,
    fontWeight: "600",
  },
  screen: { paddingHorizontal: spacing.xlSm },
  tablet: { alignSelf: "center", maxWidth: 560, width: "100%" },
});
