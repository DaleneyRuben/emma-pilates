import {
  getGetCurrentClientProfileQueryKey,
  getGetCurrentClientReferralsQueryKey,
  getGetCurrentClientSubscriptionQueryKey,
  getListEvaluationsQueryKey,
  getListPromotionsQueryKey,
  useGetCurrentClientProfile,
  useGetCurrentClientReferrals,
  useGetCurrentClientSubscription,
  useListEvaluations,
  useListPromotions,
  type ClientSubscriptionDto,
} from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  formatBolivianos,
  Heading,
  LoadingState,
  PrimaryButton,
  QueryFailure,
  useIsOnline,
  radii,
  Screen,
  spacing,
  surfaces,
  typography,
  usePullToRefresh,
  useRefetchOnFocus,
  useStudioRules,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useClientFetcher } from "../client-fetcher";
import {
  describeAllowance,
  evaluationShortcut,
  firstName,
  formatCivilDate,
  referralShortcut,
  subscriptionBadge,
} from "./home-format";
import { ShortcutRow, ShortcutSection, ShortcutTile, ShortcutTiles } from "./home-shortcuts";
import { promotionCardMaxWidth } from "./promotion-image";
import { PromotionsCarousel } from "./promotions-carousel";

type HomeNavigation = {
  navigate: (
    screen:
      | "Booking"
      | "Plans"
      | "Subscription"
      | "EvaluationAvailability"
      | "MyEvaluations"
      | "Referrals",
  ) => void;
};

const offlineBannerCopy = "Sin conexión. Mostrando tus datos de la última vez.";

const badgeStyles = {
  active: { background: "rgba(124,148,115,0.14)", text: colors.successText },
  expiring_soon: {
    background: "rgba(201,154,78,0.16)",
    text: colors.warningText,
  },
  expired: { background: "rgba(178,93,75,0.14)", text: colors.errorText },
} as const;

function SubscriptionCard({
  status,
  subscription,
  onDetail,
}: {
  status: "active" | "expiring_soon";
  subscription: NonNullable<ClientSubscriptionDto["subscription"]>;
  onDetail: () => void;
}) {
  const badge = badgeStyles[status];
  const progress =
    subscription.originalClassAllowance === 0
      ? 0
      : subscription.remainingClassAllowance / subscription.originalClassAllowance;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <BodyText style={styles.cardLabel}>Tu plan</BodyText>
        <View style={[styles.badge, { backgroundColor: badge.background }]}>
          <Text style={[styles.badgeText, { color: badge.text }]}>{subscriptionBadge(status)}</Text>
        </View>
      </View>
      <Text style={styles.planName}>{subscription.planName}</Text>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{
          max: subscription.originalClassAllowance,
          min: 0,
          now: subscription.remainingClassAllowance,
        }}
        style={styles.progressTrack}
      >
        <View style={[styles.progressFill, { flex: progress }]} />
        <View style={{ flex: 1 - progress }} />
      </View>
      <BodyText>
        {describeAllowance(
          subscription.remainingClassAllowance,
          subscription.originalClassAllowance,
        )}
      </BodyText>
      <BodyText>{`Vence el ${formatCivilDate(subscription.endsOn)}`}</BodyText>
      <Pressable
        accessibilityLabel="Ver detalle"
        accessibilityRole="button"
        onPress={onDetail}
        style={styles.detailLink}
      >
        <Text style={styles.detailLinkText}>Ver detalle</Text>
      </Pressable>
    </View>
  );
}

function OfflineHomeBanner() {
  return (
    <View accessibilityRole="alert" style={styles.offlineBanner}>
      <Text style={styles.offlineBannerText}>{offlineBannerCopy}</Text>
    </View>
  );
}

// «Paquetes desde» is the cheapest visible Plan (GET /studio-rules, BKM-004);
// while it is unknown the card leaves the price out.
function purchaseCopy(plansFromPriceCentavos: number | null | undefined): string {
  const payment = "Puedes pagar en el estudio o desde la app.";
  return plansFromPriceCentavos === null || plansFromPriceCentavos === undefined
    ? payment
    : `Paquetes desde ${formatBolivianos(plansFromPriceCentavos)}. ${payment}`;
}

function PurchaseCard({
  onPurchase,
  plansFromPriceCentavos,
}: {
  onPurchase: () => void;
  plansFromPriceCentavos: number | null | undefined;
}) {
  return (
    <View style={[styles.card, styles.purchaseCard]} testID="home-purchase-card">
      <Text style={styles.purchaseTitle}>Elige tu plan y vuelve al mat</Text>
      <BodyText style={styles.purchaseBody}>{purchaseCopy(plansFromPriceCentavos)}</BodyText>
      <PrimaryButton label="Comprar un plan" onPress={onPurchase} testID="home-buy-plan" />
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
  const studioRules = useStudioRules(fetcher);
  const queryKeys = [
    getGetCurrentClientProfileQueryKey(),
    getGetCurrentClientSubscriptionQueryKey(),
    getListEvaluationsQueryKey({ scope: "upcoming" }),
    getGetCurrentClientReferralsQueryKey(),
    getListPromotionsQueryKey(),
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

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={refreshControl}
        testID="home-scroll"
      >
        {showingCachedHome ? <OfflineHomeBanner /> : null}
        <Heading accessibilityLabel="Inicio">{`Hola, ${firstName(loadedProfile.data.name)}`}</Heading>
        <PromotionsCarousel
          loading={promotions.isPending}
          onImageMissing={() => void promotions.refetch()}
          promotions={promotions.data?.status === 200 ? promotions.data.data : []}
        />
        {hasActivePlan ? (
          <SubscriptionCard
            onDetail={() => navigation.navigate("Subscription")}
            status={view.status as "active" | "expiring_soon"}
            subscription={view.subscription!}
          />
        ) : (
          <PurchaseCard
            onPurchase={() => navigation.navigate("Plans")}
            plansFromPriceCentavos={studioRules?.plansFromPriceCentavos}
          />
        )}
        <ShortcutSection>
          <ShortcutRow
            disabled={!hasActivePlan}
            disabledNote="Necesitas un plan activo para reservar"
            label="Reservar una clase"
            note="Horarios de esta semana"
            onPress={() => navigation.navigate("Booking")}
          />
          <ShortcutTiles>
            <ShortcutTile
              icon="trend"
              label="Evaluación nutricional"
              onPress={() =>
                navigation.navigate(
                  nextEvaluation === undefined ? "EvaluationAvailability" : "MyEvaluations",
                )
              }
              summary={evaluationShortcut(nextEvaluation?.startsAt)}
            />
            <ShortcutTile
              icon="person"
              label="Invita a una amiga"
              onPress={() => navigation.navigate("Referrals")}
              summary={referralShortcut(referralCount)}
            />
          </ShortcutTiles>
        </ShortcutSection>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.smLg,
    paddingVertical: spacing.xs,
  },
  badgeText: { fontSize: typography.label, fontWeight: "600" },
  card: {
    ...surfaces.card,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardLabel: { color: colors.textMuted, fontSize: typography.label },
  centered: { alignItems: "center", flex: 1, justifyContent: "center" },
  content: { gap: spacing.xl, paddingBottom: spacing.xxl },
  detailLink: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center" },
  detailLinkText: {
    color: colors.primaryDeep,
    fontSize: typography.body,
    textDecorationLine: "underline",
  },
  offlineBanner: {
    backgroundColor: colors.warning,
    borderRadius: radii.inset,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  offlineBannerText: { color: colors.white, fontSize: typography.note, fontWeight: "500" },
  planName: {
    color: colors.text,
    fontSize: typography.titleSecondary,
    fontWeight: "500",
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
  },
  progressTrack: {
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
    flexDirection: "row",
    height: 8,
    overflow: "hidden",
  },
  purchaseBody: { color: colors.white },
  // UX-012: the tablet carousel stops at 720 px; the no-plan card takes the same cap.
  purchaseCard: {
    alignSelf: "center",
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    maxWidth: promotionCardMaxWidth,
    width: "100%",
  },
  purchaseTitle: {
    color: colors.white,
    fontSize: typography.titleSecondary,
    fontWeight: "500",
  },
  screen: { paddingBottom: 0 },
});
