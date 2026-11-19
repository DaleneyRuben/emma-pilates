import {
  getGetCurrentClientProfileQueryKey,
  getGetCurrentClientReferralsQueryKey,
  getGetCurrentClientSubscriptionQueryKey,
  getGetCurrentPaymentQueryKey,
  getListEvaluationsQueryKey,
  getListPromotionsQueryKey,
  getListUpcomingBookingsQueryKey,
  useGetCurrentClientProfile,
  useGetCurrentClientReferrals,
  useGetCurrentClientSubscription,
  useListEvaluations,
  useListPromotions,
  useListUpcomingBookings,
} from "@pilates/api-contracts";
import {
  boliviaCivilDate,
  Heading,
  LoadingState,
  OutlinedButton,
  PrimaryButton,
  QueryFailure,
  Screen,
  spacing,
  useIsOnline,
  usePullToRefresh,
  useRefetchOnFocus,
  useStudioRules,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { approvedFreeze } from "../booking/frozen-day";
import { useClientFetcher } from "../client-fetcher";
import { usePaymentStanding } from "../payments/payment-standing";
import { useResendReceipt } from "../payments/use-resend-receipt";
import { freezeToAnnounce, HomeFreezeNotice } from "./home-freeze-notice";
import { HomeHeader } from "./home-header";
import { evaluationShortcut, referralShortcut } from "./home-format";
import { bookingLockNote, PaymentInReviewCard, PaymentRejectedCard } from "./home-payment-card";
import { GuestPassCard, PurchasePlanCard } from "./home-plan-card";
import { PlanRow } from "./home-plan-row";
import { LockedShortcutRow, ShortcutSection, ShortcutTile, ShortcutTiles } from "./home-shortcuts";
import { useRetryCachedHome } from "./retry-cached-home";
import { NextClassCard, nextBookedClass } from "./next-class-card";
import { PhonePrompt } from "./phone-prompt";
import { promotionCardMaxWidth } from "./promotion-image";
import { PromotionsCarousel } from "./promotions-carousel";

type HomeNavigation = {
  navigate: (
    screen:
      | "Booking"
      | "Bookings"
      | "Plans"
      | "PaymentStatus"
      | "Subscription"
      | "EvaluationAvailability"
      | "Notifications"
      | "ProfileTab"
      | "Referrals",
  ) => void;
};

export function HomeScreen() {
  const navigation = useNavigation<HomeNavigation>();
  const fetcher = useClientFetcher();
  const online = useIsOnline();
  const queryOptions = { fetcher, query: { refetchOnMount: "always" } } as const;
  const profile = useGetCurrentClientProfile(queryOptions);
  const subscription = useGetCurrentClientSubscription(queryOptions);
  const evaluations = useListEvaluations({ scope: "upcoming" }, queryOptions);
  const referrals = useGetCurrentClientReferrals(queryOptions);
  const promotions = useListPromotions(queryOptions);
  const bookings = useListUpcomingBookings(queryOptions);
  const studioRules = useStudioRules(fetcher);
  const { pending: paymentPending, standing } = usePaymentStanding(fetcher);
  const resendReceipt = useResendReceipt();
  const queryKeys = [
    getGetCurrentClientProfileQueryKey(),
    getGetCurrentClientSubscriptionQueryKey(),
    getGetCurrentPaymentQueryKey(),
    getListEvaluationsQueryKey({ scope: "upcoming" }),
    getGetCurrentClientReferralsQueryKey(),
    getListPromotionsQueryKey(),
    getListUpcomingBookingsQueryKey(),
  ];
  useRefetchOnFocus(queryKeys);
  const refreshControl = usePullToRefresh(queryKeys);

  const refetchHome = () => {
    void Promise.all([profile.refetch(), subscription.refetch()]);
  };
  const refetchHomeRef = useRef(refetchHome);
  // A mount while already online is not a connection returning, so the first
  // observed state only records itself. A later change from offline refetches.
  const wasOffline = useRef(online ? false : null);
  useEffect(() => {
    refetchHomeRef.current = refetchHome;
    if (online && wasOffline.current === true) refetchHomeRef.current();
    wasOffline.current = !online;
  });

  // A network failure keeps the last successful answer (TanStack leaves it in
  // `data`) and reports the error. Inicio renders that answer instead of the
  // failure (FIX-011); the app's one offline banner says so (FIX-090).
  const loadedProfile = profile.data?.status === 200 ? profile.data : undefined;
  const loadedSubscription = subscription.data?.status === 200 ? subscription.data : undefined;
  const showingCachedHome =
    (profile.isError || subscription.isError) &&
    loadedProfile !== undefined &&
    loadedSubscription !== undefined;
  useRetryCachedHome(showingCachedHome, queryKeys);

  // Follow-up 246: the hero waits for the Payment too, so a Client whose
  // receipt is in review never sees «Comprar un plan» flash first.
  if (profile.isPending || subscription.isPending || paymentPending) {
    return (
      <Screen>
        <Heading accessibilityLabel="Inicio">Inicio</Heading>
        <View style={styles.centered}>
          <LoadingState label="Cargando inicio" />
        </View>
      </Screen>
    );
  }

  if (loadedProfile === undefined || loadedSubscription === undefined) {
    return (
      <Screen>
        <Heading accessibilityLabel="Inicio">Inicio</Heading>
        <QueryFailure label="No pudimos cargar tu inicio." onRetry={refetchHome} />
      </Screen>
    );
  }

  const view = loadedSubscription.data;
  const nextEvaluation =
    evaluations.data?.status === 200 ? evaluations.data.data.items[0] : undefined;
  const referralCount =
    referrals.data?.status === 200 ? referrals.data.data.referrals.length : undefined;
  const hasActivePlan =
    (view.status === "active" || view.status === "expiring_soon") &&
    view.subscription !== null &&
    view.subscription !== undefined;

  const nextClass =
    hasActivePlan && bookings.data?.status === 200
      ? nextBookedClass(bookings.data.data)
      : undefined;
  const today = boliviaCivilDate(new Date());
  const freezeNotice = hasActivePlan ? freezeToAnnounce(approvedFreeze(view, today), today) : null;
  const evaluationTile = {
    hint: evaluationShortcut(nextEvaluation?.startsAt),
    icon: "health",
    label: "Evaluación nutricional",
    onPress: () => navigation.navigate("EvaluationAvailability"),
  } as const;
  const referralTile = {
    hint: referralShortcut(referralCount),
    icon: "personAdd",
    label: "Invita a una amiga",
    onPress: () => navigation.navigate("Referrals"),
  } as const;

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={refreshControl}
        testID="home-scroll"
      >
        <HomeHeader
          onNotifications={() => navigation.navigate("Notifications")}
          onProfile={() => navigation.navigate("ProfileTab")}
          profile={loadedProfile.data}
        />
        {standing.kind === "in_review" ? (
          <PaymentInReviewCard
            hasActivePlan={hasActivePlan}
            onOpen={() => navigation.navigate("PaymentStatus")}
            payment={standing.payment}
          />
        ) : standing.kind === "rejected" ? (
          <PaymentRejectedCard
            busy={resendReceipt.busy}
            error={resendReceipt.error}
            onResend={() => void resendReceipt.resend(standing.payment.planId)}
            payment={standing.payment}
          />
        ) : null}
        {freezeNotice === null ? null : (
          <HomeFreezeNotice
            freeze={freezeNotice}
            onOpen={() => navigation.navigate("Subscription")}
          />
        )}
        {nextClass === undefined ? null : (
          // C7 A (owner 2026-11-19): the next class leads Inicio.
          <NextClassCard booking={nextClass} onPress={() => navigation.navigate("Bookings")} />
        )}
        <PromotionsCarousel
          loading={promotions.isPending}
          onImageMissing={() => void promotions.refetch()}
          promotions={promotions.data?.status === 200 ? promotions.data.data : []}
        />
        {hasActivePlan && view.subscription?.guestPass === undefined ? (
          // FIX-082 (Inicio option A): the one solid action, under the promotion;
          // a Guest Pass card carries its own. A rejected receipt's block holds
          // the solid action, so booking turns secondary there (C8 C).
          <View style={styles.underPromotion} testID="home-book-frame">
            {standing.kind === "rejected" ? (
              <OutlinedButton
                label="Reservar una clase"
                onPress={() => navigation.navigate("Booking")}
                testID="home-book"
              />
            ) : (
              <PrimaryButton
                label={nextClass === undefined ? "Reservar una clase" : "Reservar otra clase"}
                onPress={() => navigation.navigate("Booking")}
                testID="home-book"
              />
            )}
          </View>
        ) : null}
        {hasActivePlan && view.subscription?.guestPass !== undefined ? (
          <GuestPassCard
            onDetail={() => navigation.navigate("Subscription")}
            onPurchase={() => navigation.navigate("Plans")}
            view={view}
          />
        ) : hasActivePlan ? (
          <PlanRow
            expiringSoon={view.status === "expiring_soon"}
            onPress={() => navigation.navigate("Subscription")}
            subscription={view.subscription!}
          />
        ) : standing.kind === "none" ? (
          <PurchasePlanCard
            onPurchase={() => navigation.navigate("Plans")}
            plansFromPriceCentavos={studioRules?.plansFromPriceCentavos}
          />
        ) : null}
        <ShortcutSection>
          {hasActivePlan ? (
            <ShortcutTiles>
              <ShortcutTile {...evaluationTile} />
              <ShortcutTile {...referralTile} />
            </ShortcutTiles>
          ) : (
            <>
              <LockedShortcutRow
                label="Reservar una clase"
                note={
                  standing.kind === "none"
                    ? "Necesitas un plan activo"
                    : bookingLockNote[standing.kind]
                }
              />
              <ShortcutTiles>
                <ShortcutTile
                  {...evaluationTile}
                  note={nextEvaluation === undefined ? "Agenda tu cita" : evaluationTile.hint}
                />
                <ShortcutTile {...referralTile} note="Su primera clase es gratis" />
              </ShortcutTiles>
            </>
          )}
        </ShortcutSection>
      </ScrollView>
      <PhonePrompt client={loadedProfile.data} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  // On a tablet it lines up with the carousel, which starts at the left edge.
  underPromotion: { alignSelf: "flex-start", maxWidth: promotionCardMaxWidth, width: "100%" },
  centered: { alignItems: "center", flex: 1, justifyContent: "center" },
  content: { gap: spacing.xl, paddingBottom: spacing.xxl },
  screen: { paddingBottom: 0 },
});
