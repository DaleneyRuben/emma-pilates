import {
  useListAssistantClientHistory,
  type ClassHistoryEntryDto,
} from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  formatMonthHeading,
  formatSessionDate,
  QueryFailure,
  radii,
  Screen,
  ScreenTopBar,
  spacing,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { ClientBanner } from "./client-banner";
import type { ClientContext } from "./client-overview-screen";

function groupByMonth(
  entries: ClassHistoryEntryDto[],
): { heading: string; entries: ClassHistoryEntryDto[] }[] {
  const groups: { heading: string; entries: ClassHistoryEntryDto[] }[] = [];
  for (const entry of entries) {
    const heading = formatMonthHeading(entry.startsAt);
    const group = groups.at(-1);
    if (group !== undefined && group.heading === heading) {
      group.entries.push(entry);
    } else {
      groups.push({ heading, entries: [entry] });
    }
  }
  return groups;
}

export function ClientHistoryScreen({ route }: { route: { params: ClientContext } }) {
  const { clientId, clientName } = route.params;
  const navigation = useNavigation<{ goBack: () => void }>();
  const fetcher = useStaffFetcher();
  const history = useListAssistantClientHistory(clientId, {
    fetcher,
    query: { refetchOnMount: "always" },
  });

  const header = (
    <>
      <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Historial de clases" />
      <ClientBanner action="Viendo historial de" clientName={clientName} />
    </>
  );

  if (history.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <BodyText accessibilityLabel="Cargando historial">Cargando…</BodyText>
      </Screen>
    );
  }
  if (history.isError || history.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure
          label="No pudimos cargar el historial."
          onRetry={() => void history.refetch()}
        />
      </Screen>
    );
  }

  const groups = groupByMonth(history.data.data);

  return (
    <Screen style={styles.screen}>
      {header}
      {groups.length === 0 ? (
        <BodyText style={styles.empty}>
          Esta clienta aún no tiene clases en su historial.
        </BodyText>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {groups.map((group) => (
            <View key={group.heading} style={styles.group}>
              <Text style={styles.monthHeading}>{group.heading}</Text>
              {group.entries.map((entry) => (
                <View key={entry.bookingId} style={styles.card}>
                  <Text style={styles.cardTitle}>{entry.classTypeName}</Text>
                  <BodyText>{`${entry.trainerName} · ${entry.branchName}`}</BodyText>
                  <BodyText style={styles.date}>{formatSessionDate(entry.startsAt)}</BodyText>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    gap: spacing.xxs,
    padding: spacing.lg,
  },
  cardTitle: { color: colors.text, fontSize: typography.bodyLarge, fontWeight: "500" },
  date: { color: colors.textMuted, fontSize: typography.note },
  empty: { paddingTop: spacing.xl },
  group: { gap: spacing.sm },
  list: { gap: spacing.xl, paddingBottom: spacing.xxl },
  monthHeading: {
    color: colors.textMuted,
    fontSize: typography.label,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  screen: { gap: spacing.md },
});
