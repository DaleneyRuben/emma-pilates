import { useGetAssistantClientOverview, formatDateTime } from "@pilates/api-contracts";
import {
  ClientFace,
  colors,
  isCompletePhone,
  LoadingState,
  PrimaryButton,
  QueryFailure,
  radii,
  Screen,
  ScreenHeader,
  spacing,
  Text,
  OutlinedButton,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { ScrollView, StyleSheet, View } from "react-native";

import { ClientContactPanel } from "../coordinator/client-contact-panel";
import { useStaffFetcher } from "../staff-fetcher";
import { bodyScroll } from "../ui/card-pieces";
import { useStaffRole } from "../staff-role";
import { BackBar } from "../ui/back-bar";
import { PlainRow, PlainRowGroup } from "../ui/plain-rows";
import { useInClientPanel } from "./assistant-workspace";
import { canBookFor } from "./bookable-classes";
import { ClientFreezeRow } from "./client-freeze-row";
import { ClientPlanCard } from "./client-plan-card";
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
  const back = inPanel ? null : <BackBar back="Clientas" onBack={() => navigation.goBack()} />;

  if (overview.isPending) {
    return (
      <Screen style={[styles.screen, styles.gapped]}>
        {back}
        <LoadingState label="Cargando clienta" />
      </Screen>
    );
  }
  if (overview.isError || overview.data.status !== 200) {
    return (
      <Screen style={[styles.screen, styles.gapped]}>
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
  const canBook = canBookFor(data.subscription);
  // The API's subscription_not_expired rule: a queued Plan blocks a new one
  // (BKM-006), so the cash action is only offered when she can buy (UX-003).
  const futurePlan = data.subscription.nextSubscription ?? null;
  const canBuy = sells && futurePlan === null;
  const pending = client.accountStatus === "pending";
  const cash = {
    label: "Registrar pago",
    onPress: () => navigation.navigate("SelectPlan", context),
    testID: "client-overview-cash-payment",
  };
  const book = {
    label: "Reservar clase",
    onPress: () => navigation.navigate("BrowseSessions", context),
    testID: "client-overview-book",
  };

  return (
    <Screen style={styles.screen}>
      {/* E-C08: her face, name and contact sit in the band, which stays put. */}
      <ScreenHeader
        onBack={inPanel ? undefined : () => navigation.goBack()}
        testID="back-bar-block"
      >
        <View style={styles.identity}>
          <ClientFace fetcher={fetcher} name={client.name} photo={client.photo} size={56} />
          <View style={styles.identityBody}>
            <Text
              accessibilityLabel={client.name}
              accessibilityRole="header"
              variant="titulo-pagina"
            >
              {client.name}
            </Text>
            <View style={styles.contactBox}>
              <Text variant="compacto">
                {isCompletePhone(client.phone) ? (
                  describeContact(client.phone, client.email)
                ) : (
                  // Walkthrough finding 95: as the admin web's file (finding 74).
                  <>
                    <Text variant="compacto">Celular incompleto</Text>
                    {` · ${client.email}`}
                  </>
                )}
              </Text>
            </View>
          </View>
        </View>
      </ScreenHeader>
      <ScrollView contentContainerStyle={bodyScroll.content} style={bodyScroll.scroll}>
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
            display
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
            <ClientPlanCard
              active={active}
              nextPlan={futurePlan}
              sells={sells}
              subscription={subscription}
            />
            <ClientFreezeRow freeze={data.subscription.freeze} />
          </>
        )}
        {/* Staff pick E4 A: the actions on top according to the role. */}
        {sells ? (
          subscription !== null && (canBook || canBuy) ? (
            <View style={styles.pair} testID="client-overview-actions">
              {canBook ? (
                <View style={styles.wide}>
                  <PrimaryButton {...book} />
                </View>
              ) : null}
              {canBuy && canBook ? (
                <View style={styles.wide}>
                  <OutlinedButton {...cash} />
                </View>
              ) : null}
              {canBuy && !canBook ? (
                <View style={styles.wide}>
                  <PrimaryButton {...cash} />
                </View>
              ) : null}
            </View>
          ) : null
        ) : (
          <>
            <ClientContactPanel
              clientId={client.id}
              contact={data.contact}
              phone={client.phone ?? null}
            />
            {canBook ? <OutlinedButton {...book} /> : null}
          </>
        )}
        <PlainRowGroup testID="client-overview-rows">
          <PlainRow
            label="Reservas"
            onPress={() => navigation.navigate("ClientBookings", context)}
            testID="client-overview-bookings"
            value={
              data.nextBooking ? `Próxima: ${formatDateTime(data.nextBooking.startsAt)}` : undefined
            }
          />
          <PlainRow
            label="Historial de clases"
            onPress={() => navigation.navigate("ClientHistory", context)}
            testID="client-overview-history"
          />
        </PlainRowGroup>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Small text never sits on the 200 band: the contact rides on a white
  // capsule, as the band's subtitle does. It is no card, so it casts no
  // shadow; its outline is the capsule's own white.
  contactBox: {
    alignSelf: "flex-start",
    backgroundColor: colors.card,
    borderColor: colors.card,
    borderWidth: 1,
    borderRadius: radii.control + spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  gapped: { gap: spacing.md },
  identity: { alignItems: "center", flexDirection: "row", gap: spacing.mdLg },
  identityBody: { flex: 1, gap: spacing.smd },
  pair: { flexDirection: "row", gap: spacing.smLg },
  wide: { flex: 1 },
  screen: { paddingHorizontal: spacing.xlSm },
});
