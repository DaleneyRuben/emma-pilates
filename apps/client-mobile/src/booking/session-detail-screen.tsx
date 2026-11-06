import { bookingRejectionMessage } from "./booking-rejection-copy";
import {
  createBooking,
  getGetCurrentClientSubscriptionQueryKey,
  joinSessionWaitlist,
  useGetCurrentClientSubscription,
  useGetSession,
} from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  LoadingState,
  PrimaryButton,
  QueryFailure,
  Screen,
  ScreenTopBar,
  SectionTitle,
  spacing,
  typography,
  usePushNotifications,
  useStudioRules,
  isInsideCancellationWindow,
  weeklyClassesLeftLine,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { formatCivilDate } from "../home/home-format";
import { usePaymentStanding } from "../payments/payment-standing";
import { useResendReceipt } from "../payments/use-resend-receipt";
import { BookingOffFooter, bookingOffReason } from "./booking-off-footer";
import { SessionFacts, SessionHero } from "./session-facts";

export type ConfirmedBooking = {
  bookingId: string;
  classTypeName: string;
  startsAt: string;
  endsAt: string;
  planName?: string;
};

type DetailNavigation = {
  goBack: () => void;
  navigate: {
    (screen: "Plans" | "PaymentStatus"): void;
    (
      screen: "Bookings",
      params: { screen: "MyBookings"; params: { confirmed: ConfirmedBooking } },
    ): void;
  };
};

function problemMessage(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const code = (body as { code?: unknown }).code;
  const detail = (body as { detail?: unknown }).detail;
  if (code === "booking_during_freeze" && typeof detail === "string") {
    const date = /until (\d{4}-\d{2}-\d{2})$/.exec(detail)?.[1];
    if (date !== undefined) return `Tu plan está congelado hasta el ${formatCivilDate(date)}.`;
  }
  if (code === "booking_before_start_date" && typeof detail === "string") {
    const date = /: (\d{4}-\d{2}-\d{2})$/.exec(detail)?.[1];
    if (date !== undefined) return `Podrás reservar a partir del ${formatCivilDate(date)}.`;
  }
  return typeof code === "string" ? bookingRejectionMessage(code) : null;
}

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

  // 04 names where it was opened from, the Reservar tab, instead of a title.
  const header = (
    <ScreenTopBar
      fullBleed
      onBack={() => navigation.goBack()}
      title="Reservar una clase"
      tone="context"
    />
  );

  if (session.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando clase" />
      </Screen>
    );
  }

  if (session.isError || session.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
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
  const hasAllowance =
    hasPlan &&
    ((view.subscription?.remainingClassAllowance ?? 0) > 0 ||
      (view.subscription?.extraClassesLine ?? null) !== null);
  const full = forcedFull || detail.availableSeats === 0;
  // Joining inside the window is refused (the server answers 403), so the
  // offer stays hidden until the window length is known and still open.
  const waitlistOpen =
    studioRules !== undefined &&
    !isInsideCancellationWindow(detail.startsAt, new Date(), studioRules.cancellationWindowMinutes);
  const classesLeftLine = weeklyClassesLeftLine(detail.classesLeftThisWeek);

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
    <Screen style={styles.screen}>
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        <SessionHero detail={detail} full={full} />
        <SessionFacts
          cancellationWindowMinutes={studioRules?.cancellationWindowMinutes}
          detail={detail}
          full={full}
        />
        {classesLeftLine === null ? null : (
          <BodyText style={styles.note}>{classesLeftLine}</BodyText>
        )}
        {detail.classType.description.length === 0 ? null : (
          <View>
            <SectionTitle>Sobre la clase</SectionTitle>
            <BodyText style={styles.about}>{detail.classType.description}</BodyText>
          </View>
        )}
      </ScrollView>
      <View style={styles.actions}>
        {message !== null ? (
          <BodyText accessibilityRole="alert" style={styles.message}>
            {message}
          </BodyText>
        ) : null}
        {full ? (
          waitlisted ? (
            <BodyText style={styles.note}>Ya estás en la lista de espera.</BodyText>
          ) : !waitlistOpen ? (
            <BodyText style={styles.note}>
              Falta poco para la clase, así que la lista de espera ya cerró.
            </BodyText>
          ) : (
            <>
              <BodyText style={styles.note}>La lista de espera no usa clases de tu plan</BodyText>
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
            <BodyText style={styles.note}>Se descuenta 1 clase de tu plan</BodyText>
            <PrimaryButton
              busy={submitting}
              label="Reservar"
              onPress={() => void book()}
              testID="session-book"
            />
          </>
        ) : paymentPending ? (
          // The reason waits for the Payment, so «Necesitas un plan» never
          // flashes for a Client whose receipt is in review.
          <PrimaryButton disabled label="Reservar" />
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
  about: { color: colors.text, fontSize: typography.body, lineHeight: 22 },
  actions: { gap: spacing.sm, paddingBottom: spacing.sm, paddingTop: spacing.md },
  content: { gap: spacing.xl, paddingBottom: spacing.lg },
  message: { color: colors.errorText },
  note: { color: colors.textMuted, fontSize: typography.note, textAlign: "center" },
  screen: { gap: spacing.md },
});
