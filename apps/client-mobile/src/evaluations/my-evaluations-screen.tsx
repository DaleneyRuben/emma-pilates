import {
  attachEvaluationReceipt,
  cancelEvaluation,
  getListEvaluationSlotsQueryKey,
  getListEvaluationsQueryKey,
  useListEvaluations,
  type ClientEvaluationDto,
} from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  ConfirmationSheet,
  LoadingState,
  PrimaryButton,
  QueryFailure,
  radii,
  Screen,
  ScreenTopBar,
  spacing,
  surfaces,
  typography,
  useMountedAt,
  usePullToRefresh,
  useRefetchOnFocus,
  useTransientNotice,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { pickReceipt } from "../payments/receipt-upload";
import { idempotency, uploadImage } from "../uploads/image-upload";
import {
  boliviaMonth,
  clockTime,
  evaluationBadge,
  evaluationDate,
  evaluationHistoryLabel,
  followingMonth,
  monthName,
  monthPhrase,
} from "./evaluation-format";

const noticeVisibleMs = 8_000;

type EvaluationsNavigation = {
  goBack: () => void;
  navigate: (
    screen: "EvaluationAvailability",
    params?: { evaluationId: string; slotId: string; startsAt: string },
  ) => void;
  setParams: (params: { confirmed?: ClientEvaluationDto; moved?: boolean }) => void;
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
  uploading,
  onCancel,
  onReschedule,
  onAttachReceipt,
}: {
  evaluation: ClientEvaluationDto;
  highlighted: boolean;
  uploading: boolean;
  onCancel: () => void;
  onReschedule: () => void;
  onAttachReceipt: () => void;
}) {
  // The server's flag is a snapshot; the 3-hour limit is judged again when the card appears.
  const shownAt = useMountedAt();
  const open = new Date(evaluation.cancellableUntil).getTime() > shownAt;
  const cancellable = evaluation.cancellable && open;
  const reschedulable = evaluation.reschedulable === true && open;

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
        {evaluation.receiptUploadable === true ? (
          <Pressable
            accessibilityLabel="Sube tu comprobante de transferencia"
            accessibilityRole="button"
            accessibilityState={{ disabled: uploading, busy: uploading }}
            disabled={uploading}
            hitSlop={spacing.sm}
            onPress={onAttachReceipt}
            style={styles.cancel}
          >
            <Text style={styles.attachText}>
              {uploading ? "Subiendo comprobante…" : "Sube tu comprobante de transferencia"}
            </Text>
          </Pressable>
        ) : null}
        {!evaluation.included && evaluation.receiptAttached === true ? (
          <BodyText style={styles.muted}>Comprobante listo.</BodyText>
        ) : null}
        {reschedulable ? (
          <>
            <BodyText style={styles.muted}>Puedes reprogramarla hasta 3 horas antes.</BodyText>
            <Pressable
              accessibilityLabel="Reprogramar"
              accessibilityRole="button"
              hitSlop={spacing.sm}
              onPress={onReschedule}
              style={styles.cancel}
            >
              <Text style={styles.cancelText}>Reprogramar</Text>
            </Pressable>
          </>
        ) : cancellable ? (
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
  route: { params?: { confirmed?: ClientEvaluationDto; moved?: boolean } };
}) {
  const navigation = useNavigation<EvaluationsNavigation>();
  const fetcher = useClientFetcher();
  const queryClient = useQueryClient();
  const confirmed = useTransientNotice(route.params?.confirmed, noticeVisibleMs, () =>
    navigation.setParams({ confirmed: undefined, moved: undefined }),
  );
  const [cancelling, setCancelling] = useState<ClientEvaluationDto | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [receiptReady, setReceiptReady] = useState<Record<string, true>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const queryOptions = { fetcher, query: { refetchOnMount: "always" } } as const;
  const upcoming = useListEvaluations({ scope: "upcoming" }, queryOptions);
  const past = useListEvaluations({ scope: "past" }, queryOptions);
  const queryKeys = [getListEvaluationsQueryKey()];
  useRefetchOnFocus(queryKeys);
  const refreshControl = usePullToRefresh(queryKeys);

  const attachReceipt = async (evaluation: ClientEvaluationDto) => {
    if (uploadingId !== null) return;
    setFailure(null);
    setUploadingId(evaluation.id);
    try {
      const picked = await pickReceipt();
      if (picked === null) return;
      const imageAssetId = await uploadImage(picked, "transfer_receipt", fetcher);
      const attached = await attachEvaluationReceipt(
        evaluation.id,
        { imageAssetId },
        idempotency(),
        fetcher,
      );
      if (attached.status !== 204) {
        setFailure("No pudimos adjuntar el comprobante. Inténtalo de nuevo.");
        return;
      }
      setReceiptReady((current) => ({ ...current, [evaluation.id]: true }));
      await queryClient.invalidateQueries({
        queryKey: getListEvaluationsQueryKey({ scope: "upcoming" }),
      });
    } catch {
      setFailure("No pudimos adjuntar el comprobante. Inténtalo de nuevo.");
    } finally {
      setUploadingId(null);
    }
  };

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
      <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Mis evaluaciones" />
    </>
  );

  if (upcoming.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando evaluaciones" />
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
      {confirmed !== null ? (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>
            {route.params?.moved === true ? "Evaluación reprogramada" : "Evaluación confirmada"}
          </Text>
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
      <ScrollView contentContainerStyle={styles.content} refreshControl={refreshControl}>
        {items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No tienes evaluaciones próximas.</Text>
            <BodyText>
              {pastItems.some((evaluation) => boliviaMonth(evaluation.startsAt) === boliviaMonth())
                ? `Ya usaste tu evaluación de este mes. Puedes reservar la de ${monthName(followingMonth(boliviaMonth()))}, también gratuita.`
                : "Tu evaluación de este mes sigue disponible y es gratuita."}
            </BodyText>
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
                evaluation={{
                  ...evaluation,
                  receiptAttached:
                    receiptReady[evaluation.id] === true || evaluation.receiptAttached === true,
                }}
                highlighted={confirmed?.id === evaluation.id}
                key={evaluation.id}
                onAttachReceipt={() => void attachReceipt(evaluation)}
                uploading={uploadingId === evaluation.id}
                onCancel={() => setCancelling(evaluation)}
                onReschedule={() =>
                  navigation.navigate("EvaluationAvailability", {
                    evaluationId: evaluation.id,
                    slotId: evaluation.slotId,
                    startsAt: evaluation.startsAt,
                  })
                }
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
                <BodyText style={styles.muted}>{evaluationHistoryLabel(evaluation)}</BodyText>
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
      <ConfirmationSheet
        confirmLabel="Sí, cancelar evaluación"
        note="El horario queda libre y otras clientas podrán reservarlo."
        onConfirm={() => void confirmCancel()}
        onDismiss={() => setCancelling(null)}
        testID="cancel-evaluation-sheet"
        title="¿Cancelar esta evaluación?"
        visible={cancelling !== null}
      >
        {cancelling !== null ? (
          <>
            <BodyText>
              {`${evaluationDate(cancelling.startsAt)}, ${clockTime(cancelling.startsAt)} · ${cancelling.durationMinutes} min · ${cancelling.nutritionistName}`}
            </BodyText>
            <BodyText>
              {`Podrás reservar otra evaluación para ${monthPhrase(boliviaMonth(cancelling.startsAt))}.`}
            </BodyText>
          </>
        ) : null}
      </ConfirmationSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.primaryTint,
    borderRadius: radii.control,
    justifyContent: "center",
    minWidth: 48,
    paddingVertical: spacing.sm,
  },
  badgeDay: { color: colors.primaryOnTint, fontSize: typography.bodyLarge, fontWeight: "600" },
  badgeMonth: { color: colors.primaryOnTint, fontSize: typography.label },
  attachText: { color: colors.text, fontSize: typography.body, fontWeight: "500" },
  cancel: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center" },
  cancelText: { color: colors.errorText, fontSize: typography.body, fontWeight: "500" },
  card: {
    ...surfaces.card,
    borderLeftColor: colors.white,
    borderLeftWidth: 4,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
  },
  cardBody: { flex: 1, gap: spacing.xs },
  cardHighlighted: { borderLeftColor: colors.success },
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
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
  pastRow: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  pastText: { color: colors.text, flex: 1 },
  notice: {
    backgroundColor: "rgba(124,148,115,0.14)",
    borderRadius: radii.inset,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  noticeBody: { color: colors.successText },
  noticeTitle: { color: colors.successText, fontWeight: "600" },
  screen: { gap: spacing.lg },
  time: { color: colors.text, fontSize: typography.titleSecondary, fontWeight: "500" },
});
