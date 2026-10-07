import { useGetCurrentClientSubscription } from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  PrimaryButton,
  QueryFailure,
  radii,
  Screen,
  ScreenTopBar,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import {
  describeAllowance,
  formatCivilDate,
  formatCivilDateWithYear,
  subscriptionBadge,
} from "../home/home-format";

type SubscriptionNavigation = {
  goBack: () => void;
  navigate: (screen: "Plans") => void;
};

const badgeColors = {
  active: { background: "rgba(124,148,115,0.14)", text: colors.successText },
  expiring_soon: {
    background: "rgba(201,154,78,0.16)",
    text: colors.warningText,
  },
  expired: { background: "rgba(178,93,75,0.14)", text: colors.errorText },
} as const;

function allowanceMessage(remaining: number, expired: boolean): string {
  if (expired || remaining === 0) return "Sin clases disponibles";
  return remaining === 1 ? "Te queda 1 clase por usar" : `Te quedan ${remaining} clases por usar`;
}

export function SubscriptionScreen() {
  const navigation = useNavigation<SubscriptionNavigation>();
  const fetcher = useClientFetcher();
  const view = useGetCurrentClientSubscription({
    fetcher,
    query: { refetchOnMount: "always" },
  });

  const header = (
    <>
      <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Mi plan" />
    </>
  );

  if (view.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <BodyText accessibilityLabel="Cargando plan">Cargando…</BodyText>
      </Screen>
    );
  }

  if (view.isError || view.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure label="No pudimos cargar tu plan." onRetry={() => void view.refetch()} />
      </Screen>
    );
  }

  const { status, subscription } = view.data.data;

  if (status === "none" || subscription === null || subscription === undefined) {
    return (
      <Screen style={styles.screen}>
        {header}
        <BodyText>Aún no tienes un plan. Elige el paquete que mejor te acomode.</BodyText>
        <PrimaryButton label="Comprar un plan" onPress={() => navigation.navigate("Plans")} />
      </Screen>
    );
  }

  const expired = status === "expired";
  const badge = badgeColors[status];
  const progress = expired
    ? 0
    : subscription.remainingClassAllowance / subscription.originalClassAllowance;

  return (
    <Screen style={styles.screen}>
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        {status === "expiring_soon" ? (
          <View style={styles.warning}>
            <Text style={styles.warningText}>
              {`Tu plan vence el ${formatCivilDate(subscription.endsOn)}.`}
            </Text>
            <BodyText style={styles.warningNote}>Podrás comprar uno nuevo apenas termine.</BodyText>
          </View>
        ) : null}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <BodyText style={styles.cardLabel}>
              {expired ? "Último plan" : "Suscripción actual"}
            </BodyText>
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
              now: expired ? 0 : subscription.remainingClassAllowance,
            }}
            style={styles.progressTrack}
          >
            <View
              style={[styles.progressFill, { flex: progress }, expired && styles.progressExpired]}
            />
            <View style={{ flex: 1 - progress }} />
          </View>
          <BodyText>
            {describeAllowance(
              expired ? 0 : subscription.remainingClassAllowance,
              subscription.originalClassAllowance,
            )}
          </BodyText>
          <BodyText>{allowanceMessage(subscription.remainingClassAllowance, expired)}</BodyText>
        </View>
        <View style={styles.dates}>
          <View style={styles.dateRow}>
            <BodyText style={styles.dateLabel}>Inicio</BodyText>
            <Text style={styles.dateValue}>{formatCivilDateWithYear(subscription.startsOn)}</Text>
          </View>
          <View style={styles.dateRow}>
            <BodyText style={styles.dateLabel}>{expired ? "Venció el" : "Pagado hasta"}</BodyText>
            <Text style={[styles.dateValue, expired && styles.expiredDate]}>
              {formatCivilDateWithYear(subscription.endsOn)}
            </Text>
          </View>
        </View>
        {expired ? (
          <View style={styles.purchase}>
            <PrimaryButton label="Comprar un plan" onPress={() => navigation.navigate("Plans")} />
            <BodyText style={styles.note}>Elige el paquete que mejor te acomode.</BodyText>
          </View>
        ) : status === "active" ? (
          <BodyText style={styles.note}>Podrás comprar un plan nuevo cuando este termine.</BodyText>
        ) : null}
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
  content: { gap: spacing.xl, paddingBottom: spacing.xxl },
  dateLabel: { color: colors.textMuted },
  dateRow: { flexDirection: "row", justifyContent: "space-between" },
  dateValue: { color: colors.text, fontSize: typography.body },
  expiredDate: { color: colors.errorText },
  note: { color: colors.textMuted, fontSize: typography.note, textAlign: "center" },
  purchase: { gap: spacing.sm },
  warningNote: { color: colors.warningText, fontSize: typography.note },
  dates: {
    ...surfaces.flatCard,
    gap: spacing.md,
    padding: spacing.lg,
  },
  planName: {
    color: colors.text,
    fontSize: typography.titleSecondary,
    fontWeight: "500",
  },
  progressExpired: { backgroundColor: colors.disabledBackground },
  progressFill: { backgroundColor: colors.primary, borderRadius: radii.pill },
  progressTrack: {
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
    flexDirection: "row",
    height: 8,
    overflow: "hidden",
  },
  screen: { gap: spacing.lg },
  warning: {
    backgroundColor: "rgba(201,154,78,0.16)",
    borderRadius: radii.inset,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  warningText: { color: colors.warningText, fontSize: typography.body },
});
