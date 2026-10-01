import {
  cancelNutritionistEvaluation,
  getListNutritionistAgendaQueryKey,
  useGetCurrentStaffMemberProfile,
  useListNutritionistAgenda,
  type NutritionistAgendaEntryDto,
} from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  QueryFailure,
  radii,
  Screen,
  shadows,
  spacing,
  TextButton,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { RootHeader } from "../ui/root-header";
import {
  agendaDayLabel,
  boliviaToday,
  civilDateOf,
  civilDateLong,
  clockTime,
  countLabel,
} from "./nutritionist-format";

type AgendaNavigation = { navigate: (screen: "Availability") => void };

const agendaPageSize = 50;
const noticeVisibleMs = 8_000;

const kindLabel: Record<NutritionistAgendaEntryDto["kind"], string> = {
  first: "Primera evaluación",
  follow_up: "Seguimiento",
};

const groupByDay = (entries: NutritionistAgendaEntryDto[]) =>
  entries.reduce<{ date: string; entries: NutritionistAgendaEntryDto[] }[]>(
    (groups, entry) => {
      const date = civilDateOf(entry.startsAt);
      const last = groups[groups.length - 1];
      if (last?.date === date) last.entries.push(entry);
      else groups.push({ date, entries: [entry] });
      return groups;
    },
    [],
  );

function AvailabilityAction({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel="Mi disponibilidad"
      accessibilityRole="button"
      hitSlop={spacing.xs}
      onPress={onPress}
      style={styles.headerAction}
    >
      <Text style={styles.headerActionText}>Mi disponibilidad</Text>
    </Pressable>
  );
}

export function NutritionistAgendaScreen() {
  const navigation = useNavigation<AgendaNavigation>();
  const fetcher = useStaffFetcher();
  const queryClient = useQueryClient();
  const profile = useGetCurrentStaffMemberProfile({ fetcher });
  const agenda = useListNutritionistAgenda(
    { limit: agendaPageSize },
    { fetcher, query: { refetchOnMount: "always" } },
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<NutritionistAgendaEntryDto | null>(
    null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  // The «Evaluación cancelada» strip fades like 15's confirmation.
  useEffect(() => {
    if (notice === null) return undefined;
    const timer = setTimeout(() => setNotice(null), noticeVisibleMs);
    return () => clearTimeout(timer);
  }, [notice]);

  const firstName =
    profile.data?.status === 200 ? profile.data.data.name.split(" ")[0] : undefined;
  const title = firstName === undefined ? "Hola" : `Hola, ${firstName}`;
  const header = (
    <RootHeader
      action={<AvailabilityAction onPress={() => navigation.navigate("Availability")} />}
      eyebrow="Nutricionista"
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
      const response = await cancelNutritionistEvaluation(
        target.evaluationId,
        undefined,
        fetcher,
      );
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
      setSelectedId(null);
    }
  };

  if (agenda.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <BodyText accessibilityLabel="Cargando agenda">Cargando agenda…</BodyText>
      </Screen>
    );
  }

  if (agenda.isError || agenda.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure
          label="No pudimos cargar tu agenda."
          onRetry={() => void agenda.refetch()}
        />
      </Screen>
    );
  }

  const today = boliviaToday();
  const groups = groupByDay(agenda.data.data.items);

  return (
    <Screen style={styles.screen}>
      {header}
      {notice !== null ? (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Evaluación cancelada</Text>
          <BodyText style={styles.noticeBody}>{notice}</BodyText>
        </View>
      ) : null}
      {failure !== null ? (
        <BodyText accessibilityRole="alert" style={styles.failure}>
          {failure}
        </BodyText>
      ) : null}
      {groups.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No tienes evaluaciones agendadas.</Text>
          <BodyText>Revisa tu disponibilidad para que las clientas puedan reservar.</BodyText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {groups.map((group) => (
            <View key={group.date} style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupLabel}>{agendaDayLabel(group.date, today)}</Text>
                <BodyText style={styles.muted}>
                  {countLabel(group.entries.length, "evaluación", "evaluaciones")}
                </BodyText>
              </View>
              {group.entries.map((entry) => {
                const selected = entry.evaluationId === selectedId;
                // A started Evaluation can no longer be cancelled (evaluation_started).
                const cancellable = new Date(entry.startsAt).getTime() > Date.now();
                return (
                  <View key={entry.evaluationId}>
                    <Pressable
                      accessibilityLabel={`${clockTime(entry.startsAt)} ${entry.clientName}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setSelectedId(selected ? null : entry.evaluationId)}
                      style={[styles.card, selected && styles.cardSelected]}
                    >
                      <View style={styles.timeColumn}>
                        <Text style={styles.time}>{clockTime(entry.startsAt)}</Text>
                        <BodyText style={styles.muted}>{`${entry.durationMinutes} min`}</BodyText>
                      </View>
                      <View style={styles.cardBody}>
                        <Text style={styles.client}>{entry.clientName}</Text>
                        <BodyText style={styles.muted}>{kindLabel[entry.kind]}</BodyText>
                      </View>
                    </Pressable>
                    {selected && cancellable ? (
                      <Pressable
                        accessibilityLabel="Cancelar evaluación"
                        accessibilityRole="button"
                        hitSlop={spacing.sm}
                        onPress={() => setCancelling(entry)}
                        style={styles.cancel}
                      >
                        <Text style={styles.cancelText}>Cancelar evaluación</Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}
      <Modal
        animationType="slide"
        onRequestClose={() => setCancelling(null)}
        transparent
        visible={cancelling !== null}
      >
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet} testID="cancel-evaluation-sheet">
            <Text style={styles.sheetTitle}>¿Cancelar esta evaluación?</Text>
            {cancelling !== null ? (
              <>
                <BodyText>
                  {`${civilDateLong(civilDateOf(cancelling.startsAt))}, ${clockTime(cancelling.startsAt)} · ${cancelling.clientName}`}
                </BodyText>
                <BodyText>
                  {`Le avisaremos a ${cancelling.clientName} y el horario quedará libre.`}
                </BodyText>
              </>
            ) : null}
            <Pressable
              accessibilityLabel="Sí, cancelar evaluación"
              accessibilityRole="button"
              onPress={() => void confirmCancel()}
              style={styles.destructive}
            >
              <Text style={styles.destructiveText}>Sí, cancelar evaluación</Text>
            </Pressable>
            <TextButton label="Volver" onPress={() => setCancelling(null)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cancel: { alignSelf: "flex-end", minHeight: 44, justifyContent: "center" },
  cancelText: { color: colors.errorText, fontSize: typography.body, fontWeight: "500" },
  card: {
    backgroundColor: colors.white,
    borderColor: colors.white,
    borderRadius: radii.card,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: spacing.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  cardBody: { flex: 1, gap: spacing.xxs, justifyContent: "center" },
  cardSelected: { borderColor: colors.primary },
  client: { color: colors.text, fontSize: typography.bodyLarge },
  destructive: {
    alignItems: "center",
    borderColor: colors.error,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
  },
  destructiveText: { color: colors.errorText, fontSize: typography.body },
  empty: { gap: spacing.sm, paddingTop: spacing.xl },
  emptyTitle: { color: colors.text, fontSize: typography.bodyLarge, fontWeight: "500" },
  failure: { color: colors.errorText },
  group: { gap: spacing.sm },
  groupHeader: { flexDirection: "row", justifyContent: "space-between" },
  groupLabel: {
    color: colors.textMuted,
    fontSize: typography.label,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  headerAction: {
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerActionText: { color: colors.primaryDeep, fontSize: typography.note },
  list: { gap: spacing.xl, paddingBottom: spacing.xxl },
  muted: { color: colors.textMuted, fontSize: typography.note },
  notice: {
    backgroundColor: "rgba(124,148,115,0.14)",
    borderRadius: radii.card,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  noticeBody: { color: colors.successText, fontSize: typography.note },
  noticeTitle: { color: colors.successText, fontSize: typography.bodyLarge, fontWeight: "600" },
  screen: { gap: spacing.lg },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.frame,
    borderTopRightRadius: radii.frame,
    gap: spacing.md,
    padding: spacing.xl,
  },
  sheetBackdrop: {
    backgroundColor: "rgba(74,58,48,0.22)",
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetTitle: { color: colors.text, fontSize: typography.titleSecondary, fontWeight: "500" },
  time: {
    color: colors.text,
    fontSize: typography.bodyLarge,
    fontVariant: ["tabular-nums"],
    fontWeight: "600",
  },
  timeColumn: { minWidth: 56 },
});
