import {
  getGetCurrentClientProfileQueryKey,
  getGetCurrentClientReferralsQueryKey,
  getGetCurrentClientSubscriptionQueryKey,
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
  colors,
  Heading,
  LoadingState,
  QueryFailure,
  useIsOnline,
  radii,
  Screen,
  spacing,
  typography,
  usePullToRefresh,
  useRefetchOnFocus,
  useStudioRules,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useClientFetcher } from "../client-fetcher";
import { HomeHeader } from "./home-header";
import { evaluationShortcut, referralShortcut } from "./home-format";
import { ActivePlanCard, PurchasePlanCard } from "./home-plan-card";
import { LockedShortcutRow, ShortcutSection, ShortcutTile, ShortcutTiles } from "./home-shortcuts";
import { NextClassCard, nextBookedClass } from "./next-class-card";
import { PromotionsCarousel } from "./promotions-carousel";

type HomeNavigation = {
  navigate: (
    screen:
      | "Booking"
      | "Bookings"
      | "Plans"
      | "Subscription"
      | "EvaluationAvailability"
      | "MyEvaluations"
      | "Notifications"
      | "ProfileTab"
      | "Referrals",
  ) => void;
};

const offlineBannerCopy = "Sin conexión. Mostrando tus datos de la última vez.";

function OfflineHomeBanner() {
  return (
    <View accessibilityRole="alert" style={styles.offlineBanner}>
      <Text style={styles.offlineBannerText}>{offlineBannerCopy}</Text>
    </View>
  );
}

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
  const queryKeys = [
    getGetCurrentClientProfileQueryKey(),
    getGetCurrentClientSubscriptionQueryKey(),
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
  // failure, and says so when either query failed over cached data (FIX-011).
  const loadedProfile = profile.data?.status === 200 ? profile.data : undefined;
  const loadedSubscription = subscription.data?.status === 200 ? subscription.data : undefined;
  const showingCachedHome =
    (profile.isError || subscription.isError) &&
    loadedProfile !== undefined &&
    loadedSubscription !== undefined;

  if (profile.isPending || subscription.isPending) {
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
  const evaluationTile = {
    hint: evaluationShortcut(nextEvaluation?.startsAt),
    icon: "health",
    label: "Evaluación nutricional",
    onPress: () =>
      navigation.navigate(
        nextEvaluation === undefined ? "EvaluationAvailability" : "MyEvaluations",
      ),
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
        {showingCachedHome ? <OfflineHomeBanner /> : null}
        <HomeHeader
          onNotifications={() => navigation.navigate("Notifications")}
          onProfile={() => navigation.navigate("ProfileTab")}
          profile={loadedProfile.data}
        />
        <PromotionsCarousel
          loading={promotions.isPending}
          onImageMissing={() => void promotions.refetch()}
          promotions={promotions.data?.status === 200 ? promotions.data.data : []}
        />
        {hasActivePlan ? (
          <ActivePlanCard
            onDetail={() => navigation.navigate("Subscription")}
            status={view.status as "active" | "expiring_soon"}
            subscription={view.subscription!}
          />
        ) : (
          <PurchasePlanCard
            onPurchase={() => navigation.navigate("Plans")}
            plansFromPriceCentavos={studioRules?.plansFromPriceCentavos}
          />
        )}
        {nextClass === undefined ? null : (
          <NextClassCard booking={nextClass} onPress={() => navigation.navigate("Bookings")} />
        )}
        <ShortcutSection>
          {hasActivePlan ? (
            <ShortcutTiles>
              <ShortcutTile
                icon="calendar"
                label="Reservar una clase"
                onPress={() => navigation.navigate("Booking")}
              />
              <ShortcutTile {...evaluationTile} />
              <ShortcutTile {...referralTile} />
            </ShortcutTiles>
          ) : (
            <>
              <LockedShortcutRow label="Reservar una clase" note="Necesitas un plan activo" />
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: "center", flex: 1, justifyContent: "center" },
  content: { gap: spacing.xl, paddingBottom: spacing.xxl },
  offlineBanner: {
    backgroundColor: colors.warning,
    borderRadius: radii.inset,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  offlineBannerText: { color: colors.white, fontSize: typography.note, fontWeight: "500" },
  screen: { paddingBottom: 0 },
});
