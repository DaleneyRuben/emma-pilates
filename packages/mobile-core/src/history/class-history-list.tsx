import type { ClassHistoryEntryDto } from "@pilates/api-contracts";
import type { ReactElement, ReactNode } from "react";
import { type RefreshControlProps, ScrollView, StyleSheet, Text, View } from "react-native";

import { formatSessionDate } from "../time/session-format";
import { fontFamilies } from "../ui/fonts";
import { colors, spacing, surfaces, typography } from "../ui/tokens";
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
  /** FIX-041: the Trainer's 20 px photo before her name (C05d), when the app draws one. */
  trainerFace?: (entry: ClassHistoryEntryDto) => ReactNode;
};

function HistoryRow({
  entry,
  last,
  trainerFace,
}: {
  entry: ClassHistoryEntryDto;
  last: boolean;
  trainerFace?: ClassHistoryListProps["trainerFace"];
}) {
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
        {trainerFace === undefined ? (
          <Text style={styles.detail}>{detail}</Text>
        ) : (
          <View style={styles.faceLine}>
            {trainerFace(entry)}
            <Text style={[styles.detail, styles.faceText]}>{detail}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

/**
 * The attended classes of 07 and S22 (Rosa Emma C05d): the «N clases desde
 * <mes>» summary as the 600 hero, then one white card per month with its
 * header strip and the classes divided by hairlines.
 */
export function ClassHistoryList({
  entries,
  lead,
  refreshControl,
  trainerFace,
}: ClassHistoryListProps) {
  return (
    <ScrollView contentContainerStyle={styles.content} refreshControl={refreshControl}>
      <View style={styles.summary} testID="class-history-summary">
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
              trainerFace={trainerFace}
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
  faceLine: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  faceText: { flexShrink: 1 },
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  count: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.note,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  date: { alignItems: "center", gap: 1, width: 38 },
  day: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: 22,
    fontVariant: ["tabular-nums"],
  },
  detail: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: 14 },
  figure: { color: colors.onEmphasis, fontFamily: fontFamilies.display, fontSize: typography.hero },
  group: { ...surfaces.card, overflow: "hidden" },
  groupHeader: {
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingHorizontal: spacing.xlSm,
    paddingVertical: spacing.mdLg,
  },
  heading: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.label,
    fontWeight: "700",
    letterSpacing: typography.label * 0.14,
    textTransform: "uppercase",
  },
  lead: { color: colors.onEmphasis, fontFamily: fontFamilies.body, fontSize: 14 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.lg,
    paddingHorizontal: spacing.xlSm,
    paddingVertical: spacing.mdLg,
  },
  ruled: { borderBottomColor: colors.hairline, borderBottomWidth: 1 },
  summary: { ...surfaces.emphasis, gap: spacing.xs, padding: spacing.xl },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.bodyMedium,
    fontWeight: "600",
  },
  weekday: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.label,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
