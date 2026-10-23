import { useGetAssistantClientOverview, type ClientOverviewDto } from "@pilates/api-contracts";
import {
  BackLink,
  BodyText,
  colors,
  EmptyState,
  formatSessionDate,
  formatTimeRange,
  Heading,
  LoadingState,
  OutlinedButton,
  PrimaryButton,
  QueryFailure,
  radii,
  Screen,
  spacing,
  surfaces,
  TextButton,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { useStaffRole } from "../staff-role";
import { useInClientPanel } from "./assistant-workspace";
import { PendingInvitationCard } from "./pending-invitation-card";
import { formatCivilDate } from "./assistant-format";

export type ClientContext = { clientId: string; clientName: string };

type OverviewNavigation = {
  goBack: () => void;
  popToTop: () => void;
  navigate: {
    (screen: "BrowseSessions", params: ClientContext): void;
    (screen: "SelectPlan", params: ClientContext): void;
    (screen: "ClientBookings", params: ClientContext): void;
    (screen: "ClientHistory", params: ClientContext): void;
  };
};

function SubscriptionCard({
  view,
  sells,
}: {
  view: ClientOverviewDto["subscription"];
  sells: boolean;
}) {
  const subscription = view.subscription;
  if (subscription === null || subscription === undefined) {
    return (
      <EmptyState
        icon="card"
        message={
          sells
            ? "Esta clienta no tiene clases disponibles. Registra un pago para activar un plan y poder reservar."
            : "La clienta necesita un plan activo para reservar."
        }
        title="Sin plan activo"
      />
    );
  }
  const active = view.status === "active" || view.status === "expiring_soon";
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{subscription.planName}</Text>
        <View style={[styles.badge, active ? styles.badgeActive : styles.badgeExpired]}>
          <Text
            style={[styles.badgeLabel, active ? styles.badgeLabelActive : styles.badgeLabelExpired]}
          >
            {active ? "Activa" : "Vencida"}
          </Text>
        </View>
      </View>
      <BodyText>{`${subscription.remainingClassAllowance} clases restantes`}</BodyText>
      <BodyText style={styles.muted}>
        {`${active ? "Vence el" : "Venció el"} ${formatCivilDate(subscription.endsOn)}`}
      </BodyText>
    </View>
  );
}

export function ClientOverviewScreen({
  route,
}: {
  route: { params: { clientId: string; reopened?: boolean } };
}) {
  const { clientId, reopened = false } = route.params;
  const navigation = useNavigation<OverviewNavigation>();
  const fetcher = useStaffFetcher();
  // ADR-0102: the Coordinator books but never sells or manages invitations.
  const sells = useStaffRole() !== "coordinator";
  const overview = useGetAssistantClientOverview(clientId, {
    fetcher,
    query: { refetchOnMount: "always" },
  });

  // Beside the search on a tablet there is nowhere to go back to.
  const inPanel = useInClientPanel();
  const back = inPanel ? null : <BackLink onPress={() => navigation.goBack()} />;

  if (overview.isPending) {
    return (
      <Screen style={styles.screen}>
        {back}
        <LoadingState label="Cargando cliente" />
      </Screen>
    );
  }
  if (overview.isError || overview.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {back}
        <QueryFailure
          label="No pudimos cargar al cliente."
          onRetry={() => void overview.refetch()}
        />
      </Screen>
    );
  }

  const data = overview.data.data;
  const { client } = data;
  const context: ClientContext = { clientId: client.id, clientName: client.name };
  const canBook =
    (data.subscription.status === "active" || data.subscription.status === "expiring_soon") &&
    (data.subscription.subscription?.remainingClassAllowance ?? 0) > 0;
  const hasActiveSubscription =
    data.subscription.status === "active" || data.subscription.status === "expiring_soon";
  // The API's subscription_not_expired rule: a Plan paid through today blocks
  // a new one while it still holds classes or a future Booking (UX-003).
  const planStillEffective =
    hasActiveSubscription &&
    ((data.subscription.subscription?.remainingClassAllowance ?? 0) > 0 ||
      (data.nextBooking ?? null) !== null);
  const futurePlan = data.subscription.nextSubscription ?? null;

  return (
    <Screen style={styles.screen}>
      {back}
      <ScrollView contentContainerStyle={styles.content}>
        <Heading accessibilityLabel={client.name}>{client.name}</Heading>
        <BodyText style={styles.muted}>
          {client.phone ? `${client.phone} · ${client.email}` : client.email}
        </BodyText>
        {client.accountStatus === "pending" && sells ? (
          <PendingInvitationCard
            clientEmail={client.email}
            clientId={client.id}
            clientName={client.name}
            onCancelled={() => navigation.popToTop()}
            reopened={reopened}
          />
        ) : null}
        <SubscriptionCard sells={sells} view={data.subscription} />
        {data.nextBooking ? (
          <View style={styles.card}>
            <BodyText style={styles.label}>Próxima reserva</BodyText>
            <Text style={styles.cardTitle}>{data.nextBooking.classTypeName}</Text>
            <BodyText>
              {`${formatSessionDate(data.nextBooking.startsAt)} · ${formatTimeRange(data.nextBooking.startsAt, data.nextBooking.endsAt)}`}
            </BodyText>
          </View>
        ) : null}
        <View style={styles.actions}>
          <PrimaryButton
            disabled={!canBook}
            label="Reservar clase"
            onPress={() => navigation.navigate("BrowseSessions", context)}
            testID="client-overview-book"
          />
          {sells ? (
            <OutlinedButton
              disabled={planStillEffective || futurePlan !== null}
              label="Registrar pago en efectivo"
              onPress={() => navigation.navigate("SelectPlan", context)}
              testID="client-overview-cash-payment"
            />
          ) : null}
          {sells && planStillEffective ? (
            <BodyText style={styles.note}>Podrá comprar otro plan cuando este termine.</BodyText>
          ) : null}
          {sells && futurePlan !== null ? (
            <BodyText style={styles.note}>Ya tiene un plan siguiente.</BodyText>
          ) : null}
          {hasActiveSubscription ? (
            <TextButton
              label="Ver reservas"
              onPress={() => navigation.navigate("ClientBookings", context)}
              testID="client-overview-bookings"
            />
          ) : null}
        </View>
        <View style={styles.historyCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Historial</Text>
            <TextButton
              label="Ver historial completo"
              onPress={() => navigation.navigate("ClientHistory", context)}
            />
          </View>
          {data.recentHistory.length === 0 ? (
            <BodyText style={styles.muted}>Aún no tiene clases en su historial.</BodyText>
          ) : (
            data.recentHistory.map((entry) => (
              <View key={entry.bookingId} style={styles.historyRow}>
                <Text style={styles.historyTitle}>{entry.classTypeName}</Text>
                <BodyText style={styles.muted}>
                  {`${entry.trainerName} · ${entry.branchName}`}
                </BodyText>
                <BodyText style={styles.muted}>{formatSessionDate(entry.startsAt)}</BodyText>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
  badge: { borderRadius: radii.pill, paddingHorizontal: spacing.smLg, paddingVertical: spacing.xs },
  badgeActive: { backgroundColor: "rgba(124,148,115,0.16)" },
  badgeExpired: { backgroundColor: colors.errorPill },
  badgeLabel: { fontSize: typography.label, fontWeight: "600" },
  badgeLabelActive: { color: colors.successText },
  badgeLabelExpired: { color: colors.errorText },
  card: {
    ...surfaces.card,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  cardTitle: { color: colors.text, fontSize: typography.bodyLarge, fontWeight: "500" },
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  // The frames draw the history card without the shadow.
  historyCard: { ...surfaces.flatCard, gap: spacing.xs, padding: spacing.lg },
  historyRow: { gap: spacing.xxs, paddingTop: spacing.sm },
  historyTitle: { color: colors.text, fontSize: typography.body, fontWeight: "500" },
  label: { color: colors.textMuted, fontSize: typography.label, textTransform: "uppercase" },
  muted: { color: colors.textMuted, fontSize: typography.note },
  note: { color: colors.textMuted, fontSize: typography.note, textAlign: "center" },
  screen: { gap: spacing.md },
});
