import {
  cancelEvaluation,
  getListEvaluationSlotsQueryKey,
  getListEvaluationsQueryKey,
  useListEvaluations,
  type ClientEvaluationDto,
} from "@pilates/api-contracts";
import {
  BackLink,
  BodyText,
  colors,
  Heading,
  PrimaryButton,
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

import { useClientFetcher } from "../client-fetcher";
import {
  clockTime,
  evaluationBadge,
  evaluationDate,
} from "./evaluation-format";

const noticeVisibleMs = 8_000;

type EvaluationsNavigation = {
  goBack: () => void;
  navigate: (screen: "EvaluationAvailability") => void;
};

function DateBadge({ instant }: { instant: string }) {
  const badge = evaluationBadge(instant);
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeDay}>{badge.day}</Text>
      <Text style={styles.badgeMonth}>{badge.month}</Text>
    </View>
  );
}

function UpcomingCard({
  evaluation,
  highlighted,
  onCancel,
}: {
  evaluation: ClientEvaluationDto;
  highlighted: boolean;
  onCancel: () => void;
}) {
  // The server's flag is a snapshot; the 3-hour limit keeps moving.
  const cancellable =
    evaluation.cancellable && new Date(evaluation.cancellableUntil).getTime() > Date.now();

  return (
    <View style={[styles.card, highlighted && styles.cardHighlighted]}>
      <DateBadge instant={evaluation.startsAt} />
      <View style={styles.cardBody}>
        <Text style={styles.time}>{clockTime(evaluation.startsAt)}</Text>
        <BodyText>
          {`${evaluationDate(evaluation.startsAt)} · ${evaluation.durationMinutes} min`}
        </BodyText>
        <BodyText style={styles.muted}>
          {`${evaluation.nutritionistName} · Sucursal ${evaluation.branchName}`}
        </BodyText>
        {cancellable ? (
          <>
            <BodyText style={styles.muted}>Puedes cancelar hasta 3 horas antes.</BodyText>
            <Pressable
              accessibilityLabel="Cancelar"
              accessibilityRole="button"
              hitSlop={spacing.sm}
              onPress={onCancel}
              style={styles.cancel}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
          </>
        ) : (
          <BodyText style={styles.muted}>Ya no se puede cancelar</BodyText>
        )}
      </View>
    </View>
  );
}

export function MyEvaluationsScreen({
  route,
}: {
  route: { params?: { confirmed?: ClientEvaluationDto } };
}) {
  const navigation = useNavigation<EvaluationsNavigation>();
  const fetcher = useClientFetcher();
  const queryClient = useQueryClient();
  const confirmed = route.params?.confirmed;
  const [noticeFor, setNoticeFor] = useState<string | null>(confirmed?.id ?? null);
  const [cancelling, setCancelling] = useState<ClientEvaluationDto | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const queryOptions = { fetcher, query: { refetchOnMount: "always" } } as const;
  const upcoming = useListEvaluations({ scope: "upcoming" }, queryOptions);
  const past = useListEvaluations({ scope: "past" }, queryOptions);

  useEffect(() => {
    if (confirmed === undefined) return undefined;
    setNoticeFor(confirmed.id);
    const timer = setTimeout(() => setNoticeFor(null), noticeVisibleMs);
    return () => clearTimeout(timer);
  }, [confirmed]);

  const confirmCancel = async () => {
    if (cancelling === null) return;
    setFailure(null);
    try {
      const response = await cancelEvaluation(cancelling.id, undefined, fetcher);
      if (response.status !== 204) {
        setFailure("No pudimos cancelar la evaluación. Inténtalo de nuevo.");
      }
    } catch {
      setFailure("No pudimos cancelar la evaluación. Inténtalo de nuevo.");
    } finally {
      setCancelling(null);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: getListEvaluationsQueryKey({ scope: "upcoming" }),
        }),
        queryClient.invalidateQueries({ queryKey: getListEvaluationSlotsQueryKey() }),
      ]);
    }
  };

  const header = (
    <>
      <BackLink onPress={() => navigation.goBack()} />
      <Heading accessibilityLabel="Mis evaluaciones">Mis evaluaciones</Heading>
    </>
  );

  if (upcoming.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <BodyText accessibilityLabel="Cargando evaluaciones">Cargando…</BodyText>
      </Screen>
    );
  }

  if (upcoming.isError || upcoming.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure
          label="No pudimos cargar tus evaluaciones."
          onRetry={() => void upcoming.refetch()}
        />
      </Screen>
    );
  }

  const items = upcoming.data.data.items;
  const pastItems = past.data?.status === 200 ? past.data.data.items : [];

  return (
    <Screen style={styles.screen}>
      {header}
      {confirmed !== undefined && noticeFor === confirmed.id ? (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Evaluación confirmada</Text>
          <BodyText style={styles.noticeBody}>
            {`${evaluationDate(confirmed.startsAt)}, ${clockTime(confirmed.startsAt)}`}
          </BodyText>
        </View>
      ) : null}
      {failure !== null ? (
        <BodyText accessibilityRole="alert" style={styles.failure}>
          {failure}
        </BodyText>
      ) : null}
      <ScrollView contentContainerStyle={styles.content}>
        {items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No tienes evaluaciones próximas.</Text>
            <BodyText>Tu evaluación de este mes sigue disponible y es gratuita.</BodyText>
            <PrimaryButton
              label="Reservar evaluación"
              onPress={() => navigation.navigate("EvaluationAvailability")}
            />
          </View>
        ) : (
          <>
            <Text style={styles.label}>{items.length === 1 ? "Próxima" : "Próximas"}</Text>
            {items.map((evaluation) => (
              <UpcomingCard
                evaluation={evaluation}
                highlighted={noticeFor === evaluation.id}
                key={evaluation.id}
                onCancel={() => setCancelling(evaluation)}
              />
            ))}
          </>
        )}
        {pastItems.length > 0 ? (
          <>
            <Text style={styles.label}>Anteriores</Text>
            {pastItems.map((evaluation) => (
              <View key={evaluation.id} style={styles.pastRow}>
                <DateBadge instant={evaluation.startsAt} />
                <BodyText style={styles.pastText}>
                  {`${clockTime(evaluation.startsAt)} · ${evaluation.nutritionistName}`}
                </BodyText>
                <BodyText style={styles.muted}>Realizada</BodyText>
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
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
              <BodyText>
                {`${evaluationDate(cancelling.startsAt)}, ${clockTime(cancelling.startsAt)} · ${cancelling.durationMinutes} min · ${cancelling.nutritionistName}`}
              </BodyText>
            ) : null}
            <BodyText>El horario queda libre y otras clientas podrán reservarlo.</BodyText>
            <BodyText>Podrás reservar otra evaluación para este mes.</BodyText>
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
  badge: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: radii.control,
    justifyContent: "center",
    minWidth: 48,
    paddingVertical: spacing.sm,
  },
  badgeDay: { color: colors.primaryDeep, fontSize: typography.bodyLarge, fontWeight: "600" },
  badgeMonth: { color: colors.primaryDeep, fontSize: typography.label },
  cancel: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center" },
  cancelText: { color: colors.errorText, fontSize: typography.body, fontWeight: "500" },
  card: {
    backgroundColor: colors.white,
    borderLeftColor: colors.white,
    borderLeftWidth: 4,
    borderRadius: radii.card,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    ...shadows.card,
  },
  cardBody: { flex: 1, gap: spacing.xs },
  cardHighlighted: { borderLeftColor: colors.success },
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  destructive: {
    alignItems: "center",
    borderColor: colors.error,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
  },
  destructiveText: { color: colors.errorText, fontSize: typography.body },
  empty: { gap: spacing.lg, paddingTop: spacing.xl },
  emptyTitle: { color: colors.text, fontSize: typography.bodyLarge, fontWeight: "500" },
  failure: { color: colors.errorText },
  label: {
    color: colors.textMuted,
    fontSize: typography.label,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  muted: { color: colors.textMuted, fontSize: typography.note },
  notice: {
    backgroundColor: "rgba(124,148,115,0.14)",
    borderRadius: radii.card,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  noticeBody: { color: colors.successText, fontSize: typography.note },
  noticeTitle: { color: colors.successText, fontSize: typography.bodyLarge, fontWeight: "600" },
  pastRow: {
    alignItems: "center",
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  pastText: { flex: 1 },
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
  time: { color: colors.text, fontSize: typography.titleSecondary, fontWeight: "500" },
});
