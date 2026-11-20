import {
  getGetCurrentClientSubscriptionQueryKey,
  getListEvaluationSlotsQueryKey,
  getListEvaluationsQueryKey,
  useGetCurrentClientSubscription,
  useListEvaluations,
  useListEvaluationSlots,
  type ClientEvaluationDto,
  type EvaluationSlotDto,
} from "@pilates/api-contracts";
import {
  BodyText,
  BrandToast,
  colors,
  ConfirmationSheet,
  fontFamilies,
  Glyph,
  LoadingState,
  QueryFailure,
  Screen,
  ScreenTopBar,
  SectionTitle,
  spacing,
  StateScreen,
  surfaces,
  usePullToRefresh,
  useRefetchOnFocus,
  typography,
  useStickyNotice,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { PastEvaluations } from "./evaluation-card";
import {
  boliviaMonth,
  clockTime,
  evaluationDate,
  evaluationHistoryLabel,
  monthPhrase,
} from "./evaluation-format";
import { planOfferLine } from "./evaluation-offer-copy";
import { EvaluationReceiptSheet } from "./evaluation-receipt-sheet";
import { EvaluationBookingSection } from "./evaluation-booking-section";
import { openDays } from "./evaluation-slot-picker";
import { NextEvaluationCard } from "./next-evaluation-card";
import { RescheduleConfirmSheet } from "./reschedule-confirm-sheet";
import { useEvaluationCommands } from "./use-evaluation-commands";

type Notice = { evaluation: ClientEvaluationDto; moved?: boolean };

type EvaluationNavigation = {
  goBack: () => void;
  navigate: {
    (screen: "Plans"): void;
    (screen: "BookEvaluation", params: { slot: EvaluationSlotDto }): void;
  };
  setParams: (params: { confirmed?: ClientEvaluationDto }) => void;
};

const toastTitle = (notice: Notice) =>
  notice.moved === true
    ? "Evaluación reprogramada"
    : notice.evaluation.included
      ? "Evaluación confirmada"
      : "Comprobante enviado";

/**
 * C13, walkthrough finding 70 (follow-up 264, option A): one «Evaluación
 * nutricional» with the next Evaluation and its actions on top, the slots
 * to book (or to move it to) below, and «Anteriores» at the foot. Since C5
 * pick C the appointment is the 600 hero with its actions inside,
 * and «¿Otra evaluación?» offers the next three slots before the calendar.
 */
export function EvaluationAvailabilityScreen({
  route,
}: {
  route?: { params?: { confirmed?: ClientEvaluationDto } };
}) {
  const navigation = useNavigation<EvaluationNavigation>();
  const fetcher = useClientFetcher();
  const commands = useEvaluationCommands(fetcher);
  const queryOptions = { fetcher, query: { refetchOnMount: "always" } } as const;
  const subscription = useGetCurrentClientSubscription(queryOptions);
  const slots = useListEvaluationSlots(undefined, queryOptions);
  const upcoming = useListEvaluations({ scope: "upcoming" }, queryOptions);
  const past = useListEvaluations({ scope: "past" }, queryOptions);
  // She stays on this screen and comes back to it: a pull or a return also
  // refreshes the turnos and her Plan, not only her Evaluations.
  const queryKeys = [
    getListEvaluationsQueryKey(),
    getListEvaluationSlotsQueryKey(),
    getGetCurrentClientSubscriptionQueryKey(),
  ];
  useRefetchOnFocus(queryKeys);
  const refreshControl = usePullToRefresh(queryKeys);
  const [moving, setMoving] = useState<ClientEvaluationDto | null>(null);
  // The turno she picked and the one she is leaving, kept apart from the list
  // that refreshes under the sheet once the move lands.
  const [target, setTarget] = useState<{ slot: EvaluationSlotDto; from: string } | null>(null);
  const [cancelling, setCancelling] = useState<ClientEvaluationDto | null>(null);
  const [receiptFor, setReceiptFor] = useState<ClientEvaluationDto | null>(null);
  const [movedNotice, setMovedNotice] = useState<Notice | null>(null);
  const dismissConfirmed = () => navigation.setParams({ confirmed: undefined });
  const confirmed = useStickyNotice(route?.params?.confirmed, dismissConfirmed);
  const notice: Notice | null =
    movedNotice ?? (confirmed === null ? null : { evaluation: confirmed });

  const header = (
    <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Evaluación nutricional" />
  );

  if (subscription.isPending || slots.isPending || upcoming.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando evaluaciones" />
      </Screen>
    );
  }

  // A turnos failure only empties the booking section: her booked ones stay.
  const availability = slots.data?.status === 200 ? slots.data.data : null;
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

  const items = upcoming.data.data.items.map((evaluation) => ({
    ...evaluation,
    receiptAttached:
      commands.receiptReady[evaluation.id] === true || evaluation.receiptAttached === true,
    receiptUploadable:
      commands.receiptReady[evaluation.id] === true ? false : evaluation.receiptUploadable,
  }));
  const pastItems = past.data?.status === 200 ? past.data.data.items : [];
  const status = subscription.data?.status === 200 ? subscription.data.data.status : "none";
  const hasPlan = status === "active" || status === "expiring_soon";
  const movingNow = moving === null ? null : (items.find((item) => item.id === moving.id) ?? null);

  if (items.length === 0 && pastItems.length === 0 && !hasPlan) {
    return (
      <Screen style={styles.screen}>
        {header}
        <StateScreen
          icon="lock"
          note="Con el plan trimestral, la primera evaluación del trimestre es gratis."
          primaryAction={{ label: "Ver planes", onPress: () => navigation.navigate("Plans") }}
          title="Necesitas un plan activo"
        />
      </Screen>
    );
  }

  // Walkthrough finding 97: a paid Evaluation whose slot the studio released
  // still holds her payment. Until she picks its new time through Elegir
  // turno, the screen offers no other Evaluation to pay for.
  const awaitingNewSlot =
    movingNow === null && items.some((evaluation) => evaluation.slotReleased === true);
  const days = availability === null ? [] : openDays(availability, movingNow?.slotId);
  const offer = availability === null ? null : planOfferLine(availability);
  const pick = (slot: EvaluationSlotDto) =>
    movingNow === null
      ? navigation.navigate("BookEvaluation", { slot })
      : setTarget({ slot, from: movingNow.startsAt });
  const failure =
    commands.failure === null ? null : (
      <View style={styles.failureBox}>
        <BodyText accessibilityRole="alert" style={styles.failure}>
          {commands.failure}
        </BodyText>
      </View>
    );
  const confirmMove = async () => {
    if (movingNow === null || target === null) return;
    const moved = await commands.move(movingNow, target.slot);
    setTarget(null);
    if (moved === null) return;
    setMoving(null);
    setMovedNotice({ evaluation: moved, moved: true });
  };

  return (
    <Screen style={styles.screen}>
      {header}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={refreshControl}
        testID="evaluation-scroll"
      >
        {items.length === 0 && offer !== null ? (
          // C13: her Plan's offer on a white card with the tag glyph.
          <View style={styles.offer} testID="evaluation-offer">
            <Glyph color={colors.text} name="tag" size={18} strokeWidth={1.5} />
            <BodyText style={styles.offerText}>{offer}</BodyText>
          </View>
        ) : null}
        {movingNow === null ? failure : null}
        {items.length > 0 ? (
          <View>
            {/* One appointment names itself in its block («Tu cita»). */}
            {items.length > 1 ? <SectionTitle>Tus próximas evaluaciones</SectionTitle> : null}
            <View style={styles.cards}>
              {items.map((evaluation, index) => (
                <NextEvaluationCard
                  evaluation={evaluation}
                  key={evaluation.id}
                  moving={movingNow !== null}
                  onAttachReceipt={() => setReceiptFor(evaluation)}
                  onCancel={() => setCancelling(evaluation)}
                  onMove={() => {
                    // The toast would sit over the turnos she now has to tap.
                    setMovedNotice(null);
                    dismissConfirmed();
                    commands.clearFailure();
                    setMoving(evaluation);
                  }}
                  secondary={index > 0}
                  uploading={commands.uploadingId === evaluation.id}
                />
              ))}
            </View>
          </View>
        ) : null}
        {awaitingNewSlot ? null : (
          <EvaluationBookingSection
            availability={availability}
            booked={items.length > 0}
            days={days}
            failure={failure}
            hasPlan={hasPlan}
            moving={movingNow}
            offer={offer}
            onPick={pick}
            onPlans={() => navigation.navigate("Plans")}
            onRetry={() => void slots.refetch()}
            onStopMoving={() => setMoving(null)}
          />
        )}
        {pastItems.length > 0 ? (
          <View>
            <SectionTitle>Anteriores</SectionTitle>
            <PastEvaluations evaluations={pastItems} label={evaluationHistoryLabel} />
          </View>
        ) : null}
      </ScrollView>
      <RescheduleConfirmSheet
        busy={commands.movingBusy}
        currentStartsAt={target?.from}
        onConfirm={() => void confirmMove()}
        onDismiss={() => setTarget(null)}
        target={target?.slot ?? null}
      />
      <EvaluationReceiptSheet
        evaluation={receiptFor}
        fetcher={fetcher}
        onAttach={() => {
          if (receiptFor === null) return;
          const evaluation = receiptFor;
          void commands.attachReceipt(evaluation).then((outcome) => {
            // A closed picker or a busy upload leaves the sheet as it is.
            if (outcome === "skipped") return;
            // Closes only this Evaluation's sheet: another may be open by now.
            setReceiptFor((current) => (current?.id === evaluation.id ? null : current));
          });
        }}
        onClose={() => setReceiptFor(null)}
        uploading={commands.uploadingId !== null}
      />
      <ConfirmationSheet
        confirmLabel="Sí, cancelar evaluación"
        note="El horario queda libre y otras clientas podrán reservarlo."
        onConfirm={() => {
          if (cancelling === null) return;
          const evaluation = cancelling;
          setCancelling(null);
          void commands.cancel(evaluation);
        }}
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
      {notice !== null ? (
        <BrandToast
          note={`${evaluationDate(notice.evaluation.startsAt)}, ${clockTime(notice.evaluation.startsAt)}`}
          onClose={() => {
            setMovedNotice(null);
            dismissConfirmed();
          }}
          title={toastTitle(notice)}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cards: { gap: spacing.md },
  content: { gap: spacing.md, paddingBottom: spacing.xxl, paddingTop: spacing.xxs },
  failure: { color: colors.errorText, fontSize: 14, lineHeight: 20 },
  failureBox: {
    ...surfaces.soft,
    borderColor: colors.borderStrong,
    borderWidth: 1.5,
    paddingHorizontal: spacing.mdLg,
    paddingVertical: spacing.md,
  },
  offer: {
    ...surfaces.card,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.smLg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
  offerText: {
    color: colors.text,
    flex: 1,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.body,
    fontWeight: "600",
    lineHeight: 21,
  },
  screen: { gap: spacing.md },
});
