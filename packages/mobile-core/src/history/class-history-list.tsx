import type { ClassHistoryEntryDto } from "@pilates/api-contracts";
import type { ReactElement } from "react";
import { type RefreshControlProps, ScrollView, StyleSheet, Text, View } from "react-native";

import { formatSessionDate } from "../time/session-format";
import { fontFamilies } from "../ui/fonts";
import { colors, spacing, typography } from "../ui/tokens";
import {
  classCountLabel,
  groupClassHistoryByMonth,
  historyDayLabel,
  summarizeClassHistory,
} from "./class-history-groups";

type ClassHistoryListProps = {
  /** Newest first, as the API lists them. */
  entries: ClassHistoryEntryDto[];
  /** «Has asistido a» on the Client's own history (07), «Ha asistido a» on S22. */
  lead: string;
  /** The pull-to-refresh control of the screen that owns the list (UX-004). */
  refreshControl?: ReactElement<RefreshControlProps>;
};

function HistoryRow({ entry, last }: { entry: ClassHistoryEntryDto; last: boolean }) {
  const { day, weekday } = historyDayLabel(entry.startsAt);
  const detail = `${entry.trainerName} · ${entry.branchName}`;
  return (
    <View
      accessibilityLabel={`${formatSessionDate(entry.startsAt)}, ${entry.classTypeName}, ${detail}`}
      accessible
      style={[styles.row, !last && styles.ruled]}
      testID="class-history-row"
    >
      <View style={styles.date}>
        <Text style={styles.day}>{day}</Text>
        <Text style={styles.weekday}>{weekday}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{entry.classTypeName}</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
    </View>
  );
}

/**
 * The attended classes of 07 and S22: a «N clases desde <mes>» summary, then
 * one group per month whose rows sit between rules on the screen (MOB-040).
 */
export function ClassHistoryList({ entries, lead, refreshControl }: ClassHistoryListProps) {
  return (
    <ScrollView contentContainerStyle={styles.content} refreshControl={refreshControl}>
      <View style={styles.summary}>
        <Text style={styles.lead}>{lead}</Text>
        <Text style={styles.figure}>{summarizeClassHistory(entries)}</Text>
      </View>
      {groupClassHistoryByMonth(entries).map((group) => (
        <View key={group.heading} style={styles.group}>
          <View style={styles.groupHeader}>
            <Text style={styles.heading}>{group.heading}</Text>
            <Text style={styles.count}>{classCountLabel(group.entries.length)}</Text>
          </View>
          {group.entries.map((entry, index) => (
            <HistoryRow
              entry={entry}
              key={entry.bookingId}
              last={index === group.entries.length - 1}
            />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

// The frames' own steps where the spacing scale has none: 1 and 3 inside a
// row, 30 between the summary and the month groups.
const styles = StyleSheet.create({
  body: { flex: 1, gap: 3 },
  content: { gap: 30, paddingBottom: spacing.xxl },
  count: {
    color: colors.textSubtle,
    fontFamily: fontFamilies.body,
    fontSize: typography.label,
    fontVariant: ["tabular-nums"],
  },
  date: { alignItems: "center", gap: 1, width: 38 },
  day: {
    color: colors.text,
    fontFamily: fontFamilies.heading,
    fontSize: 20,
    fontVariant: ["tabular-nums"],
  },
  detail: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  figure: { color: colors.text, fontFamily: fontFamilies.heading, fontSize: 26 },
  group: { gap: spacing.smd },
  groupHeader: {
    alignItems: "baseline",
    borderBottomColor: colors.borderStrong,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingBottom: spacing.smLg,
  },
  heading: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.76,
    textTransform: "uppercase",
  },
  lead: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  row: { alignItems: "center", flexDirection: "row", gap: spacing.lg, paddingVertical: spacing.lg },
  ruled: { borderBottomColor: colors.rule, borderBottomWidth: 1 },
  summary: { gap: spacing.xxs },
  title: { color: colors.text, fontFamily: fontFamilies.heading, fontSize: typography.bodyLarge },
  weekday: {
    color: colors.textSubtle,
    fontFamily: fontFamilies.body,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
