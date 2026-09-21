import {
  useGetCurrentClientProfile,
  useGetCurrentClientSubscription,
  type ClientSubscriptionDto,
} from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  Heading,
  PrimaryButton,
  QueryFailure,
  radii,
  Screen,
  shadows,
  spacing,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import {
  describeAllowance,
  firstName,
  formatCivilDate,
  subscriptionBadge,
} from "./home-format";

type HomeNavigation = {
  navigate: (screen: "Booking" | "Plans" | "Subscription") => void;
};

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
      : subscription.remainingClassAllowance /
        subscription.originalClassAllowance;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <BodyText style={styles.cardLabel}>Tu plan</BodyText>
        <View style={[styles.badge, { backgroundColor: badge.background }]}>
          <Text style={[styles.badgeText, { color: badge.text }]}>
            {subscriptionBadge(status)}
          </Text>
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
      <BodyText>{`Pagado hasta el ${formatCivilDate(subscription.endsOn)}`}</BodyText>
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

function PurchaseCard({ onPurchase }: { onPurchase: () => void }) {
  return (
    <View style={[styles.card, styles.purchaseCard]}>
      <Text style={styles.purchaseTitle}>Elige tu plan y vuelve al mat</Text>
      <BodyText style={styles.purchaseBody}>
        Paquetes desde Bs 560. Puedes pagar en el estudio o desde la app.
      </BodyText>
      <PrimaryButton label="Comprar un plan" onPress={onPurchase} />
    </View>
  );
}

function QuickAction({
  disabled,
  label,
  note,
  onPress,
}: {
  disabled: boolean;
  label: string;
  note?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.action, disabled && styles.actionDisabled]}
    >
      <Text style={[styles.actionLabel, disabled && styles.actionLabelDisabled]}>
        {label}
      </Text>
      {disabled && note !== undefined ? (
        <BodyText style={styles.actionNote}>{note}</BodyText>
      ) : null}
    </Pressable>
  );
}

export function HomeScreen() {
  const navigation = useNavigation<HomeNavigation>();
  const fetcher = useClientFetcher();
  const queryOptions = { fetcher, query: { refetchOnMount: "always" } } as const;
  const profile = useGetCurrentClientProfile(queryOptions);
  const subscription = useGetCurrentClientSubscription(queryOptions);

  const retry = () => {
    void Promise.all([profile.refetch(), subscription.refetch()]);
  };

  if (profile.isPending || subscription.isPending) {
    return (
      <Screen>
        <Heading accessibilityLabel="Inicio">Inicio</Heading>
        <View style={styles.centered}>
          <BodyText accessibilityLabel="Cargando inicio">Cargando…</BodyText>
        </View>
      </Screen>
    );
  }

  if (
    profile.isError ||
    subscription.isError ||
    profile.data.status !== 200 ||
    subscription.data.status !== 200
  ) {
    return (
      <Screen>
        <Heading accessibilityLabel="Inicio">Inicio</Heading>
        <QueryFailure label="No pudimos cargar tu inicio." onRetry={retry} />
      </Screen>
    );
  }

  const view = subscription.data.data;
  const hasActivePlan =
    (view.status === "active" || view.status === "expiring_soon") &&
    view.subscription !== null &&
    view.subscription !== undefined;

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Heading accessibilityLabel="Inicio">{`Hola, ${firstName(profile.data.data.name)}`}</Heading>
        {hasActivePlan ? (
          <SubscriptionCard
            onDetail={() => navigation.navigate("Subscription")}
            status={view.status as "active" | "expiring_soon"}
            subscription={view.subscription!}
          />
        ) : (
          <PurchaseCard onPurchase={() => navigation.navigate("Plans")} />
        )}
        <View style={styles.actions}>
          <QuickAction
            disabled={!hasActivePlan}
            label="Reservar una clase"
            note="Necesitas un plan activo para reservar"
            onPress={() => navigation.navigate("Booking")}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  action: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    gap: spacing.xs,
    padding: spacing.lg,
    ...shadows.card,
  },
  actionDisabled: { backgroundColor: colors.disabledBackground },
  actionLabel: {
    color: colors.text,
    fontSize: typography.bodyLarge,
    fontWeight: "500",
  },
  actionLabelDisabled: { color: colors.disabledText },
  actionNote: { color: colors.textMuted, fontSize: typography.note },
  actions: { gap: spacing.md },
  badge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.smLg,
    paddingVertical: spacing.xs,
  },
  badgeText: { fontSize: typography.label, fontWeight: "600" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    gap: spacing.sm,
    padding: spacing.lg,
    ...shadows.card,
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
  purchaseCard: { backgroundColor: colors.primary },
  purchaseTitle: {
    color: colors.white,
    fontSize: typography.titleSecondary,
    fontWeight: "500",
  },
  screen: { paddingBottom: 0 },
});
