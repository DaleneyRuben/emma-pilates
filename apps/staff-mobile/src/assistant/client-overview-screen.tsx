import { useGetAssistantClientOverview } from "@pilates/api-contracts";
import {
  boliviaCivilDate,
  ClientFace,
  colors,
  dayChipLabel,
  fontFamilies,
  formatTimeRange,
  IconRow,
  IconRowGroup,
  LoadingState,
  OutlinedButton,
  PrimaryButton,
  QueryFailure,
  Screen,
  SectionTitle,
  spacing,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { useStaffRole } from "../staff-role";
import { BackBar } from "../ui/back-bar";
import { useInClientPanel } from "./assistant-workspace";
import { PlanHero } from "./plan-hero";
import { StateCard } from "./state-card";
import { PendingInvitationCard } from "./pending-invitation-card";
import { describeContact } from "./assistant-format";

/** Whose behalf the Assistant acts on, carried from her file to each step. */
export type ClientContext = {
  clientId: string;
  clientName: string;
  clientPhoto: { imageAssetId: string } | null;
};

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

// «Mar 3 · 09:30»: when her next Booking is, beside «Próximas reservas».
function nextLabel(startsAt: string, endsAt: string): string {
  const { weekday, day } = dayChipLabel(boliviaCivilDate(new Date(startsAt)));
  const label = `${weekday} ${day} · ${formatTimeRange(startsAt, endsAt).split(" – ")[0]}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** S06, the Client's file (v2, walkthrough 17). */
export function ClientOverviewScreen({
  route,
}: {
  route: { params: { clientId: string; reopened?: boolean } };
}) {
  const { clientId, reopened = false } = route.params;
  const navigation = useNavigation<OverviewNavigation>();
  const fetcher = useStaffFetcher();
  // ADR-0102: the Coordinator books but never sells. She follows up the
  // invitations of the Clients she registers (FIX-040).
  const sells = useStaffRole() !== "coordinator";
  const overview = useGetAssistantClientOverview(clientId, {
    fetcher,
    query: { refetchOnMount: "always" },
  });

  // Beside the search on a tablet there is nowhere to go back to.
  const inPanel = useInClientPanel();
  const back = inPanel ? null : <BackBar back="Clientes" onBack={() => navigation.goBack()} />;

  if (overview.isPending) {
    return (
      <Screen style={styles.screen}>
        {back}
        <LoadingState label="Cargando clienta" />
      </Screen>
    );
  }
  if (overview.isError || overview.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {back}
        <QueryFailure
          label="No pudimos cargar a la clienta."
          onRetry={() => void overview.refetch()}
        />
      </Screen>
    );
  }

  const data = overview.data.data;
  const { client } = data;
  const context: ClientContext = {
    clientId: client.id,
    clientName: client.name,
    clientPhoto: client.photo,
  };
  const active =
    data.subscription.status === "active" || data.subscription.status === "expiring_soon";
  const subscription = data.subscription.subscription ?? null;
  const canBook = active && (subscription?.remainingClassAllowance ?? 0) > 0;
  // The API's subscription_not_expired rule: a queued Plan blocks a new one
  // (BKM-006), so the cash action is only offered when she can buy (UX-003).
  const futurePlan = data.subscription.nextSubscription ?? null;
  const canBuy = sells && futurePlan === null;
  const pending = client.accountStatus === "pending";
  const cash = {
    label: "Registrar pago en efectivo",
    onPress: () => navigation.navigate("SelectPlan", context),
    testID: "client-overview-cash-payment",
  };

  return (
    <Screen style={styles.screen}>
      {back}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.identity}>
          <ClientFace fetcher={fetcher} name={client.name} photo={client.photo} size={56} />
          <View style={styles.identityBody}>
            <Text accessibilityLabel={client.name} accessibilityRole="header" style={styles.name}>
              {client.name}
            </Text>
            <Text style={styles.contact}>{describeContact(client.phone, client.email)}</Text>
          </View>
        </View>
        {pending ? (
          <PendingInvitationCard
            clientEmail={client.email}
            clientId={client.id}
            clientName={client.name}
            onCancelled={() => navigation.popToTop()}
            reopened={reopened}
          />
        ) : null}
        {subscription === null ? (
          <StateCard
            action={canBuy ? cash : undefined}
            icon="card"
            testID="client-no-plan"
            note={
              !sells
                ? "La clienta necesita un plan activo para reservar."
                : pending
                  ? "Puede comprar su plan ahora, aunque todavía no haya activado su cuenta."
                  : "Registra un pago para activar un plan y poder reservarle clases."
            }
            title="Sin plan activo"
          />
        ) : (
          <>
            <PlanHero active={active} subscription={subscription} />
            <View style={styles.actions}>
              {canBook ? (
                <PrimaryButton
                  label="Reservar clase"
                  onPress={() => navigation.navigate("BrowseSessions", context)}
                  testID="client-overview-book"
                />
              ) : null}
              {canBuy ? canBook ? <OutlinedButton {...cash} /> : <PrimaryButton {...cash} /> : null}
              {sells && futurePlan !== null ? (
                <Text style={styles.note}>Ya tiene un plan siguiente.</Text>
              ) : null}
            </View>
          </>
        )}
        <View>
          <SectionTitle>Reservas</SectionTitle>
          <IconRowGroup>
            <IconRow
              chevron
              icon="calendar"
              label="Próximas reservas"
              onPress={() => navigation.navigate("ClientBookings", context)}
              testID="client-overview-bookings"
              value={
                data.nextBooking
                  ? nextLabel(data.nextBooking.startsAt, data.nextBooking.endsAt)
                  : undefined
              }
            />
            <IconRow
              chevron
              icon="clock"
              label="Historial de clases"
              onPress={() => navigation.navigate("ClientHistory", context)}
              testID="client-overview-history"
            />
          </IconRowGroup>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
  contact: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: 14 },
  content: { gap: spacing.xl, paddingBottom: spacing.xxl },
  identity: { alignItems: "center", flexDirection: "row", gap: spacing.lg },
  identityBody: { flex: 1, gap: spacing.xxs },
  name: { color: colors.text, fontFamily: fontFamilies.display, fontSize: 24 },
  note: { color: colors.textMuted, fontSize: typography.note, textAlign: "center" },
  screen: { gap: spacing.md, paddingHorizontal: spacing.xlSm },
});
