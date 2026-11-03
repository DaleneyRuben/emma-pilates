import {
  cancelNutritionistEvaluation,
  getListNutritionistAgendaQueryKey,
  useGetCurrentStaffMemberProfile,
  useListNutritionistAgenda,
  type NutritionistAgendaEntryDto,
} from "@pilates/api-contracts";
import {
  BrandToast,
  CardActionRow,
  cardWithActionRow,
  colors,
  ConfirmationSheet,
  fontFamilies,
  IconRow,
  IconRowGroup,
  LoadingState,
  NoticeRow,
  QueryFailure,
  Screen,
  spacing,
  StateScreen,
  surfaces,
  usePullToRefresh,
  useRefetchOnFocus,
  useStickyNotice,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { RootHeader } from "../ui/root-header";
import { SectionHeader } from "../ui/section-header";
import { dayHeading } from "../ui/session-time";
import {
  agendaDayLabel,
  boliviaToday,
  civilDateOf,
  clockTime,
  countLabel,
} from "./nutritionist-format";

const agendaPageSize = 50;

const kindLabel: Record<NutritionistAgendaEntryDto["kind"], string> = {
  first: "Primera evaluación",
  follow_up: "Seguimiento",
};

const groupByDay = (entries: NutritionistAgendaEntryDto[]) =>
  entries.reduce<{ date: string; entries: NutritionistAgendaEntryDto[] }[]>((groups, entry) => {
    const date = civilDateOf(entry.startsAt);
    const last = groups[groups.length - 1];
    if (last?.date === date) last.entries.push(entry);
    else groups.push({ date, entries: [entry] });
    return groups;
  }, []);

export function NutritionistAgendaScreen() {
  const navigation = useNavigation<{ navigate: (tab: "AvailabilityTab") => void }>();
  const fetcher = useStaffFetcher();
  const queryClient = useQueryClient();
  const profile = useGetCurrentStaffMemberProfile({ fetcher });
  const agenda = useListNutritionistAgenda(
    { limit: agendaPageSize },
    { fetcher, query: { refetchOnMount: "always" } },
  );
  const queryKeys = [getListNutritionistAgendaQueryKey()];
  useRefetchOnFocus(queryKeys);
  const refreshControl = usePullToRefresh(queryKeys);
  const [cancelling, setCancelling] = useState<NutritionistAgendaEntryDto | null>(null);
  const [cancelledNotice, setNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  // The «Evaluación cancelada» toast stays until closed or the screen changes.
  const clearNotice = () => setNotice(null);
  const notice = useStickyNotice(cancelledNotice ?? undefined, clearNotice);

  const firstName = profile.data?.status === 200 ? profile.data.data.name.split(" ")[0] : undefined;
  const title = firstName === undefined ? "Hola" : `Hola, ${firstName}`;
  const header = (
    <RootHeader
      bell
      eyebrow={`Nutricionista · ${dayHeading(boliviaToday())}`}
      label="Mi agenda"
      title={title}
    />
  );

  const confirmCancel = async () => {
    if (cancelling === null) return;
    const target = cancelling;
    setFailure(null);
    setNotice(null);
    let cancelled = false;
    try {
      const response = await cancelNutritionistEvaluation(target.evaluationId, undefined, fetcher);
      cancelled = response.status === 204;
      if (!cancelled) {
        setFailure("No pudimos cancelar la evaluación. Inténtalo de nuevo.");
      }
    } catch {
      setFailure("No pudimos cancelar la evaluación. Inténtalo de nuevo.");
    } finally {
      setCancelling(null);
      await queryClient.invalidateQueries({
        queryKey: getListNutritionistAgendaQueryKey({ limit: agendaPageSize }),
      });
    }
    // Announce the cancellation only once the refreshed agenda no longer lists it.
    if (cancelled) {
      setNotice(`${target.clientName} · ${clockTime(target.startsAt)}`);
    }
  };

  if (agenda.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando agenda" />
      </Screen>
    );
  }

  if (agenda.isError || agenda.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure label="No pudimos cargar tu agenda." onRetry={() => void agenda.refetch()} />
      </Screen>
    );
  }

  const today = boliviaToday();
  const groups = groupByDay(agenda.data.data.items);

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.list} refreshControl={refreshControl}>
        {header}
        {failure !== null ? (
          <View accessibilityLabel={failure} accessibilityRole="alert">
            <NoticeRow message={failure} />
          </View>
        ) : null}
        {groups.length === 0 ? (
          <StateScreen
            icon="calendar"
            layout="inList"
            note="Revisa tu disponibilidad para que las clientas puedan reservar."
            primaryAction={{
              label: "Ver mi disponibilidad",
              onPress: () => navigation.navigate("AvailabilityTab"),
            }}
            title="No tienes evaluaciones"
          />
        ) : (
          groups.map((group) => (
            <View key={group.date}>
              <SectionHeader
                meta={countLabel(group.entries.length, "evaluación", "evaluaciones")}
                title={agendaDayLabel(group.date, today)}
              />
              <View style={styles.cards}>
                {group.entries.map((entry) => {
                  // A started Evaluation can no longer be cancelled (evaluation_started).
                  const cancellable = new Date(entry.startsAt).getTime() > Date.now();
                  return (
                    <View
                      key={entry.evaluationId}
                      style={[styles.card, cancellable && cardWithActionRow]}
                    >
                      <View
                        accessibilityLabel={`${clockTime(entry.startsAt)} ${entry.clientName}`}
                        accessible
                        style={styles.cardBody}
                      >
                        <View style={styles.timeColumn}>
                          <Text numberOfLines={1} style={styles.time}>
                            {clockTime(entry.startsAt)}
                          </Text>
                          <Text style={styles.quiet}>{`${entry.durationMinutes} min`}</Text>
                        </View>
                        <View style={styles.who}>
                          <Text style={styles.client}>{entry.clientName}</Text>
                          <Text style={styles.quiet}>{kindLabel[entry.kind]}</Text>
                        </View>
                      </View>
                      {cancellable ? (
                        <CardActionRow
                          label="Cancelar evaluación"
                          onPress={() => setCancelling(entry)}
                          testID={`cancel-evaluation-${entry.evaluationId}`}
                          tone="error"
                        />
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>
      <ConfirmationSheet
        confirmLabel="Sí, cancelar evaluación"
        note="Esto no se puede deshacer."
        onConfirm={() => void confirmCancel()}
        onDismiss={() => setCancelling(null)}
        testID="cancel-evaluation-sheet"
        title="¿Cancelar esta evaluación?"
        visible={cancelling !== null}
      >
        {cancelling !== null ? (
          <IconRowGroup>
            <IconRow
              icon="calendar"
              label={`${agendaDayLabel(civilDateOf(cancelling.startsAt), today).split(" · ")[0]}, ${clockTime(cancelling.startsAt)} · ${cancelling.clientName}`}
            />
            <IconRow icon="bell" label="Le avisamos y el horario queda libre" />
          </IconRowGroup>
        ) : null}
      </ConfirmationSheet>
      {notice !== null ? (
        <BrandToast note={notice} onClose={clearNotice} title="Evaluación cancelada" />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { ...surfaces.card, gap: spacing.md, padding: spacing.lg },
  cardBody: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  cards: { gap: spacing.md },
  client: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 16 },
  list: { gap: spacing.xl, paddingBottom: spacing.xxl },
  quiet: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: 13 },
  screen: { paddingHorizontal: spacing.xlSm },
  time: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: 20,
    fontVariant: ["tabular-nums"],
  },
  // «07:00» in Lora 20 runs wider than 56 pt on both platforms (more so on
  // Android): a fixed width wrapped it, so 56 is only the floor.
  timeColumn: { flexShrink: 0, minWidth: 56 },
  who: { flex: 1, gap: spacing.xxs },
});
