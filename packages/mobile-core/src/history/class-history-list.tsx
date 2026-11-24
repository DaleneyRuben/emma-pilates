import type { ClassHistoryEntryDto } from "@pilates/api-contracts";
import type { ReactElement } from "react";
import { type RefreshControlProps, ScrollView, StyleSheet, View } from "react-native";

import { formatSessionDate } from "../time/session-format";
import { TabletGrid, useWideScreen } from "../ui/tablet-layout";
import { Text } from "../ui/text";
import { colors, spacing, surfaces } from "../ui/tokens";
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

function HistoryRow({
  card = false,
  entry,
  last,
}: {
  /** 07T: a tablet draws each class as its own card. */
  card?: boolean;
  entry: ClassHistoryEntryDto;
  last: boolean;
}) {
  const { day, weekday } = historyDayLabel(entry.startsAt);
  const detail = `${entry.trainerName} · ${entry.branchName}`;
  return (
    <View
      accessibilityLabel={`${formatSessionDate(entry.startsAt)}, ${entry.classTypeName}, ${detail}`}
      accessible
      style={[styles.row, card ? styles.card : !last && styles.ruled]}
      testID="class-history-row"
    >
      <View style={styles.date}>
        <Text variant="cifra">{day}</Text>
        <Text variant="etiqueta">{weekday}</Text>
      </View>
      <View style={styles.body}>
        <Text variant="titulo-fila">{entry.classTypeName}</Text>
        <Text variant="secundario">{detail}</Text>
      </View>
    </View>
  );
}

/**
 * The attended classes of 07 and S22 (Rosa Emma C05d): the «N clases desde
 * <mes>» summary as the 600 hero, then one white card per month with its
 * header strip and the classes divided by hairlines.
 */
export function ClassHistoryList({ entries, lead, refreshControl }: ClassHistoryListProps) {
  // 07T: on a tablet page each month is its header strip over its classes,
  // two cards to a row, 12 pt apart.
  const wide = useWideScreen();
  return (
    <ScrollView contentContainerStyle={styles.content} refreshControl={refreshControl}>
      <View style={styles.summary} testID="class-history-summary">
        <Text tone="onDark" variant="cuerpo">
          {lead}
        </Text>
        <Text tone="onDark" variant="titulo-bloque">
          {summarizeClassHistory(entries)}
        </Text>
      </View>
      {groupClassHistoryByMonth(entries).map((group) => {
        const header = (
          <View style={[styles.groupHeader, wide && styles.wideHeader]}>
            <Text variant="etiqueta">{group.heading}</Text>
            <Text variant="pastilla">{classCountLabel(group.entries.length)}</Text>
          </View>
        );
        if (wide) {
          return (
            <View key={group.heading} style={styles.wideGroup} testID="class-history-month">
              {header}
              <TabletGrid gap={spacing.md} testID="class-history-grid">
                {group.entries.map((entry) => (
                  <HistoryRow card entry={entry} key={entry.bookingId} last />
                ))}
              </TabletGrid>
            </View>
          );
        }
        return (
          <View key={group.heading} style={styles.group}>
            {header}
            {group.entries.map((entry, index) => (
              <HistoryRow
                entry={entry}
                key={entry.bookingId}
                last={index === group.entries.length - 1}
              />
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

// The frames' own steps where the spacing scale has none: 1 and 3 inside a
// row, 30 between the summary and the month groups.
const styles = StyleSheet.create({
  body: { flex: 1, gap: 3 },
  card: { ...surfaces.card, flex: 1, paddingHorizontal: spacing.lg },
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  date: { alignItems: "center", gap: 1, width: 38 },
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
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.lg,
    paddingHorizontal: spacing.xlSm,
    paddingVertical: spacing.mdLg,
  },
  ruled: { borderBottomColor: colors.hairline, borderBottomWidth: 1 },
  summary: { ...surfaces.emphasis, gap: spacing.xs, padding: spacing.xl },
  wideGroup: { gap: spacing.smLg },
  // The month's strip stands as its own card above the class cards.
  wideHeader: { ...surfaces.card, backgroundColor: colors.surfaceSubtle },
});
