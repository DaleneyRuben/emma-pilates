import {
  attachEvaluationReceipt,
  cancelEvaluation,
  getListEvaluationSlotsQueryKey,
  getListEvaluationsQueryKey,
  useListEvaluations,
  useListEvaluationSlots,
  type ClientEvaluationDto,
} from "@pilates/api-contracts";
import {
  BodyText,
  BrandToast,
  colors,
  ConfirmationSheet,
  LoadingState,
  QueryFailure,
  Screen,
  ScreenTopBar,
  SectionTitle,
  spacing,
  StateScreen,
  usePullToRefresh,
  useRefetchOnFocus,
  useStickyNotice,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { pickReceipt } from "../payments/receipt-upload";
import { idempotency, uploadImage } from "../uploads/image-upload";
import { PastEvaluations, UpcomingEvaluationCard } from "./evaluation-card";
import { EvaluationReceiptSheet } from "./evaluation-receipt-sheet";
import {
  boliviaMonth,
  clockTime,
  evaluationDate,
  evaluationHistoryLabel,
  followingMonth,
  monthName,
  monthPhrase,
} from "./evaluation-format";
import { planOfferLine } from "./evaluation-offer-copy";

type EvaluationsNavigation = {
  goBack: () => void;
  navigate: (
    screen: "EvaluationAvailability",
    params?: { evaluationId: string; slotId: string; startsAt: string },
  ) => void;
  setParams: (params: { confirmed?: ClientEvaluationDto; moved?: boolean }) => void;
};

export function MyEvaluationsScreen({
  route,
}: {
  route: { params?: { confirmed?: ClientEvaluationDto; moved?: boolean } };
}) {
  const navigation = useNavigation<EvaluationsNavigation>();
  const fetcher = useClientFetcher();
  const queryClient = useQueryClient();
  const dismissConfirmed = () => navigation.setParams({ confirmed: undefined, moved: undefined });
  const confirmed = useStickyNotice(route.params?.confirmed, dismissConfirmed);
  const [cancelling, setCancelling] = useState<ClientEvaluationDto | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [receiptReady, setReceiptReady] = useState<Record<string, true>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  // C15c: the paid Evaluation whose QR and receipt sheet is open (follow-up 262).
  const [receiptFor, setReceiptFor] = useState<ClientEvaluationDto | null>(null);
  // One upload at a time, even for two taps before the next render.
  const uploadBusy = useRef(false);
  const queryOptions = { fetcher, query: { refetchOnMount: "always" } } as const;
  const upcoming = useListEvaluations({ scope: "upcoming" }, queryOptions);
  const past = useListEvaluations({ scope: "past" }, queryOptions);
  // The empty state says what her Plan gives, as the picker does.
  const slots = useListEvaluationSlots(undefined, queryOptions);
  const queryKeys = [getListEvaluationsQueryKey()];
  useRefetchOnFocus(queryKeys);
  const refreshControl = usePullToRefresh(queryKeys);

  const attachReceipt = async (evaluation: ClientEvaluationDto) => {
    if (uploadBusy.current) return;
    uploadBusy.current = true;
    // Closes only this Evaluation's sheet: another may be open by the time it finishes.
    const closeSheet = () =>
      setReceiptFor((current) => (current?.id === evaluation.id ? null : current));
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
      closeSheet();
      if (attached.status !== 204) {
        setFailure("No pudimos adjuntar el comprobante. Inténtalo de nuevo.");
        return;
      }
      setReceiptReady((current) => ({ ...current, [evaluation.id]: true }));
      await queryClient.invalidateQueries({
        queryKey: getListEvaluationsQueryKey({ scope: "upcoming" }),
      });
    } catch {
      closeSheet();
      setFailure("No pudimos adjuntar el comprobante. Inténtalo de nuevo.");
    } finally {
      uploadBusy.current = false;
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
      {failure !== null ? (
        <BodyText accessibilityRole="alert" style={styles.failure}>
          {failure}
        </BodyText>
      ) : null}
      <ScrollView contentContainerStyle={styles.content} refreshControl={refreshControl}>
        {items.length === 0 ? (
          <StateScreen
            icon="calendar"
            layout="inList"
            note={
              pastItems.some((evaluation) => boliviaMonth(evaluation.startsAt) === boliviaMonth())
                ? `Ya usaste tu evaluación de este mes. Puedes reservar la de ${monthName(followingMonth(boliviaMonth()))}.`
                : slots.data?.status === 200
                  ? (planOfferLine(slots.data.data) ?? undefined)
                  : undefined
            }
            primaryAction={{
              label: "Reservar evaluación",
              onPress: () => navigation.navigate("EvaluationAvailability"),
            }}
            title="No tienes evaluaciones próximas"
          />
        ) : (
          <View>
            <SectionTitle>{items.length === 1 ? "Próxima" : "Próximas"}</SectionTitle>
            <View style={styles.cards}>
              {items.map((evaluation) => (
                <UpcomingEvaluationCard
                  evaluation={{
                    ...evaluation,
                    receiptAttached:
                      receiptReady[evaluation.id] === true || evaluation.receiptAttached === true,
                  }}
                  key={evaluation.id}
                  onAttachReceipt={() => setReceiptFor(evaluation)}
                  onCancel={() => setCancelling(evaluation)}
                  onReschedule={() =>
                    navigation.navigate("EvaluationAvailability", {
                      evaluationId: evaluation.id,
                      slotId: evaluation.slotId,
                      startsAt: evaluation.startsAt,
                    })
                  }
                  uploading={uploadingId === evaluation.id}
                />
              ))}
            </View>
          </View>
        )}
        {pastItems.length > 0 ? (
          <View>
            <SectionTitle>Anteriores</SectionTitle>
            <PastEvaluations evaluations={pastItems} label={evaluationHistoryLabel} />
          </View>
        ) : null}
      </ScrollView>
      <EvaluationReceiptSheet
        evaluation={receiptFor}
        fetcher={fetcher}
        onAttach={() => {
          if (receiptFor !== null) void attachReceipt(receiptFor);
        }}
        onClose={() => setReceiptFor(null)}
        uploading={uploadingId !== null}
      />
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
      {confirmed !== null ? (
        <BrandToast
          note={`${evaluationDate(confirmed.startsAt)}, ${clockTime(confirmed.startsAt)}`}
          onClose={dismissConfirmed}
          title={route.params?.moved === true ? "Evaluación reprogramada" : "Evaluación confirmada"}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cards: { gap: spacing.md },
  content: { gap: spacing.xl, paddingBottom: spacing.xxl },
  failure: { color: colors.errorText },
  screen: { gap: spacing.lg },
});
