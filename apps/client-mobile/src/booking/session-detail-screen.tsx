import {
  createBooking,
  getGetCurrentClientSubscriptionQueryKey,
  getListUpcomingBookingsQueryKey,
  joinSessionWaitlist,
  useGetCurrentClientSubscription,
  useGetSession,
} from "@pilates/api-contracts";
import {
  boliviaCivilDate,
  colors,
  InlineError,
  isInsideCancellationWindow,
  LoadingState,
  PrimaryButton,
  QueryFailure,
  Screen,
  ScreenHeader,
  ScreenTopBar,
  shadows,
  spacing,
  surfaces,
  Text,
  usePushNotifications,
  useStudioRules,
  weeklyClassesLeftLine,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { usePaymentStanding } from "../payments/payment-standing";
import { useResendReceipt } from "../payments/use-resend-receipt";
import { BookingOffFooter, bookingOffReason } from "./booking-off-footer";
import { FrozenBookingFooter } from "./frozen-booking-footer";
import { OwnBookingFooter } from "./own-booking-footer";
import { problemMessage, usesLine } from "./session-detail-copy";
import { SessionFacts } from "./session-facts";
import { SessionHero } from "./session-hero";
import { useInSessionPanel } from "./session-panel-context";

export type ConfirmedBooking = {
  bookingId: string;
  classTypeName: string;
  startsAt: string;
  endsAt: string;
  planName?: string;
  /** FIX-090: a Reschedule moved her Booking; the toast says so. */
  rescheduled?: boolean;
};

type DetailNavigation = {
  goBack: () => void;
  navigate: {
    (screen: "Plans" | "PaymentStatus"): void;
    (
      screen: "Bookings",
      params: { screen: "MyBookings"; params?: { confirmed: ConfirmedBooking } },
    ): void;
  };
};

export function SessionDetailScreen({ route }: { route: { params: { sessionId: string } } }) {
  const navigation = useNavigation<DetailNavigation>();
  const fetcher = useClientFetcher();
  const { offerPermission: offerPushPermission } = usePushNotifications();
  const queryClient = useQueryClient();
  const session = useGetSession(route.params.sessionId, {
    fetcher,
    query: { refetchOnMount: "always" },
  });
  const studioRules = useStudioRules(fetcher);
  const subscription = useGetCurrentClientSubscription({ fetcher });
  const { pending: paymentPending, standing } = usePaymentStanding(fetcher);
  const resendReceipt = useResendReceipt();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [forcedFull, setForcedFull] = useState(false);
  const [waitlisted, setWaitlisted] = useState(false);
  // 03T: beside Reservar's list the class has no header of its own, and the
  // panel keeps its own 24 pt padding and footer.
  const inPanel = useInSessionPanel();
  const screenProps = inPanel
    ? { edges: [] as const, style: [styles.screen, styles.panelScreen] }
    : { style: styles.screen };

  // Until the class is known the header says «Clase»; then C4 A's block names
  // it, so the header is only the arrow (FIX-089: never the screen before).
  const header = inPanel ? null : session.data?.status === 200 ? (
    <ScreenHeader fullBleed inset onBack={() => navigation.goBack()} testID="screen-top-bar" />
  ) : (
    <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Clase" />
  );

  if (session.isPending) {
    return (
      <Screen {...screenProps}>
        {header}
        <LoadingState label="Cargando clase" />
      </Screen>
    );
  }

  if (session.isError || session.data.status !== 200) {
    return (
      <Screen {...screenProps}>
        {header}
        <QueryFailure label="No pudimos cargar la clase." onRetry={() => void session.refetch()} />
      </Screen>
    );
  }

  const detail = session.data.data;
  const view = subscription.data?.status === 200 ? subscription.data.data : null;
  const hasPlan =
    view !== null &&
    (view.status === "active" || view.status === "expiring_soon") &&
    view.subscription !== null &&
    view.subscription !== undefined;
  // A spent Guest Pass covers no other class (walkthrough n.º 57).
  const spentGuestPass = (view?.subscription?.guestPass?.usedClassStartsAt ?? null) !== null;
  // The Plan bought after it covers a class from its start, as the server
  // books against the Subscription that covers the class's day.
  const next = view?.nextSubscription;
  const nextCovers =
    next != null &&
    next.remainingClassAllowance > 0 &&
    boliviaCivilDate(new Date(detail.startsAt)) >= next.startsOn;
  const hasAllowance =
    hasPlan &&
    (nextCovers ||
      (!spentGuestPass &&
        ((view.subscription?.remainingClassAllowance ?? 0) > 0 ||
          (view.subscription?.extraClassesLine ?? null) !== null)));
  const full = forcedFull || detail.availableSeats === 0;
  // Joining inside the window is refused (the server answers 403), so the
  // offer stays hidden until the window length is known and still open.
  const waitlistOpen =
    studioRules !== undefined &&
    !isInsideCancellationWindow(detail.startsAt, new Date(), studioRules.cancellationWindowMinutes);
  // Walkthrough finding 53 (owner 2026-11-08): the server refuses a Booking
  // or a waitlist entry inside an approved Freeze, so say it before the tap.
  const classDay = boliviaCivilDate(new Date(detail.startsAt));
  const frozenOnClassDay =
    view?.freeze?.state === "approved" &&
    classDay >= view.freeze.startsOn &&
    classDay <= view.freeze.endsOn;
  // A frozen day books nothing, so the week's count says nothing (FIX-082).
  const classesLeftLine = frozenOnClassDay
    ? null
    : weeklyClassesLeftLine(detail.classesLeftThisWeek);

  const book = async () => {
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await createBooking(
        detail.id,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            "idempotency-key": randomUUID(),
          },
        },
        fetcher,
      );

      if (response.status === 201) {
        await queryClient.invalidateQueries({
          queryKey: getGetCurrentClientSubscriptionQueryKey(),
        });
        offerPushPermission();
        navigation.navigate("Bookings", {
          screen: "MyBookings",
          params: {
            confirmed: {
              bookingId: response.data.id,
              classTypeName: detail.classType.name,
              startsAt: detail.startsAt,
              endsAt: detail.endsAt,
              planName: view?.subscription?.planName,
            },
          },
        });
        return;
      }

      const code = (response.data as { code?: string }).code;
      if (code === "session_full") {
        setForcedFull(true);
        return;
      }
      setMessage(
        problemMessage(response.data) ?? "No pudimos completar la reserva. Inténtalo de nuevo.",
      );
    } catch {
      setMessage("No pudimos completar la reserva. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const joinWaitlist = async () => {
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await joinSessionWaitlist(
        detail.id,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            "idempotency-key": randomUUID(),
          },
        },
        fetcher,
      );

      if (response.status === 201) {
        setWaitlisted(true);
        offerPushPermission();
        return;
      }
      if ((response.data as { code?: string }).code === "active_waitlist_entry_exists") {
        setWaitlisted(true);
        return;
      }
      setMessage(
        problemMessage(response.data) ??
          "No pudimos anotarte en la lista de espera. Inténtalo de nuevo.",
      );
    } catch {
      setMessage("No pudimos anotarte en la lista de espera. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen {...screenProps}>
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        <SessionHero detail={detail} quiet={frozenOnClassDay} />
        <SessionFacts
          // A frozen day books nothing, so there is nothing to cancel (FIX-082).
          cancellationWindowMinutes={
            frozenOnClassDay ? undefined : studioRules?.cancellationWindowMinutes
          }
          detail={detail}
          full={full}
        />
        {classesLeftLine === null ? null : (
          <View style={styles.weekNotice} testID="session-week-notice">
            <Text style={styles.centered} variant="titulo-fila">
              {classesLeftLine}
            </Text>
          </View>
        )}
        {detail.classType.description.length === 0 ? null : (
          <View style={styles.aboutCard}>
            <Text accessibilityRole="header" variant="titulo-fila">
              Sobre la clase
            </Text>
            <Text variant="cuerpo">{detail.classType.description}</Text>
          </View>
        )}
      </ScrollView>
      {/* C04: the action and its line sit on the white footer. */}
      <View style={[styles.actions, inPanel && styles.panelActions]} testID="session-footer">
        {message !== null ? (
          <View style={styles.messageBox}>
            <InlineError>{message}</InlineError>
          </View>
        ) : null}
        {detail.yourBooking != null ? (
          <OwnBookingFooter
            booking={detail.yourBooking}
            cancellationWindowMinutes={studioRules?.cancellationWindowMinutes}
            onCancelled={() =>
              Promise.all([
                session.refetch(),
                queryClient.invalidateQueries({
                  queryKey: getGetCurrentClientSubscriptionQueryKey(),
                }),
                queryClient.invalidateQueries({ queryKey: getListUpcomingBookingsQueryKey() }),
              ])
            }
            onOpenBooking={() => navigation.navigate("Bookings", { screen: "MyBookings" })}
          />
        ) : frozenOnClassDay && view?.freeze != null ? (
          <FrozenBookingFooter
            endsOn={view.freeze.endsOn}
            onOtherDay={() => navigation.goBack()}
            startsOn={view.freeze.startsOn}
          />
        ) : full ? (
          waitlisted ? (
            <Text style={[styles.status, styles.statusTall]} variant="titulo-fila">
              Ya estás en la lista de espera.
            </Text>
          ) : !waitlistOpen ? (
            <Text style={styles.status} variant="titulo-fila">
              Falta poco para la clase, así que la lista de espera ya cerró.
            </Text>
          ) : (
            <>
              <Text style={styles.centered} variant="secundario">
                La lista de espera no usa clases de tu plan
              </Text>
              <PrimaryButton
                busy={submitting}
                label="Unirme a la lista de espera"
                onPress={() => void joinWaitlist()}
                testID="session-join-waitlist"
              />
            </>
          )
        ) : hasAllowance ? (
          <>
            <PrimaryButton
              busy={submitting}
              label="Reservar esta clase"
              onPress={() => void book()}
              testID="session-book"
            />
            <Text style={styles.centered} variant="secundario">
              {view?.subscription?.guestPass?.usedClassStartsAt === null
                ? "Es tu clase gratis de invitada"
                : usesLine(nextCovers ? next : (view?.subscription ?? null))}
            </Text>
          </>
        ) : paymentPending ? (
          // The reason waits for the Payment, so «Necesitas un plan» never
          // flashes for a Client whose receipt is in review.
          <PrimaryButton disabled label="Reservar esta clase" />
        ) : (
          <BookingOffFooter
            busy={resendReceipt.busy}
            error={resendReceipt.error}
            onAction={() => {
              if (standing.kind === "in_review") navigation.navigate("PaymentStatus");
              else if (standing.kind === "rejected")
                void resendReceipt.resend(standing.payment.planId);
              else navigation.navigate("Plans");
            }}
            reason={bookingOffReason(standing, hasPlan)}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  aboutCard: { ...surfaces.card, gap: spacing.smd, padding: spacing.lg },
  // A white panel from edge to edge with the card shadow cast upward.
  actions: {
    ...shadows.footer,
    backgroundColor: colors.card,
    gap: spacing.sm,
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.xlSm,
    paddingVertical: spacing.mdLg,
  },
  centered: { textAlign: "center" },
  content: { gap: spacing.md, paddingBottom: spacing.lg, paddingTop: spacing.xxs },
  panelActions: {
    marginHorizontal: -spacing.xl,
    paddingBottom: spacing.xlSm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  panelScreen: { gap: spacing.md, padding: spacing.xl, paddingBottom: 0 },
  messageBox: {
    backgroundColor: colors.primaryTint,
    borderColor: colors.borderStrong,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: spacing.mdLg,
    paddingVertical: spacing.md,
  },
  screen: { gap: spacing.md, paddingBottom: 0 },
  status: { paddingVertical: spacing.sm, textAlign: "center" },
  statusTall: { paddingVertical: spacing.md },
  weekNotice: { ...surfaces.soft, paddingHorizontal: spacing.lg, paddingVertical: spacing.mdLg },
});
