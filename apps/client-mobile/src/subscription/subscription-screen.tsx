import {
  getGetCurrentClientSubscriptionQueryKey,
  useGetCurrentClientSubscription,
} from "@pilates/api-contracts";
import {
  addCivilDays,
  BodyText,
  boliviaCivilDate,
  BrandToast,
  colors,
  EmphasisCard,
  fontFamilies,
  formatBolivianos,
  LoadingState,
  nextPlanStartWindowDays,
  PrimaryButton,
  QueryFailure,
  Screen,
  ScreenTopBar,
  StateScreen,
  surfaces,
  SectionTitle,
  spacing,
  typography,
  usePullToRefresh,
  useRefetchOnFocus,
  useStudioRules,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { guestPassCopy } from "../home/guest-pass-copy";
import { formatCivilDate } from "../home/home-format";
import { FreezeCard, freezeCardState } from "./freeze-card";
import { freezeWindow } from "./freeze-window";
import { ActionRow, ActionRows, NoticeList, type PlanNotice } from "./subscription-actions";
import { DetailRows, SubscriptionHero } from "./subscription-parts";

type SubscriptionNavigation = {
  goBack: () => void;
  navigate: (screen: "FreezePlan" | "Plans") => void;
};

/**
 * C12 Mi plan (Rosa Emma): the plan card is the 600 hero; renewing sits with
 * its hint in a white card; notices, details and freezing are white cards.
 * Reservar lives on the tab bar.
 */
export function SubscriptionScreen() {
  const navigation = useNavigation<SubscriptionNavigation>();
  const fetcher = useClientFetcher();
  const view = useGetCurrentClientSubscription({
    fetcher,
    query: { refetchOnMount: "always" },
  });
  const queryKeys = [getGetCurrentClientSubscriptionQueryKey()];
  useRefetchOnFocus(queryKeys);
  const refreshControl = usePullToRefresh(queryKeys);
  const studioRules = useStudioRules(fetcher);
  const [withdrawnToast, setWithdrawnToast] = useState(false);

  const header = <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Mi plan" />;

  if (view.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando plan" />
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

  const data = view.data.data;
  const { status, subscription, nextSubscription, founderRenewalDeadline, freeze } = data;

  if (status === "none" || subscription === null || subscription === undefined) {
    return (
      <Screen style={styles.screen}>
        {header}
        {/* Rosa Emma C12a: the white state card with its disc and the action. */}
        <StateScreen
          icon="card"
          layout="card"
          note="Elige el paquete que mejor te acomode."
          title="Aún no tienes un plan."
        >
          <PrimaryButton label="Comprar un plan" onPress={() => navigation.navigate("Plans")} />
        </StateScreen>
      </Screen>
    );
  }

  const expired = status === "expired";
  // Walkthrough n.º 56 and 60: a Guest Pass is one free class, never renewed.
  const guestPass = guestPassCopy(data);
  const today = boliviaCivilDate(new Date());
  const renewalStartsOn = data.renewalStartsOn ?? addCivilDays(subscription.endsOn, 1);
  const details: [string, string][] = [
    ["Empezó", formatCivilDate(subscription.startsOn)],
    [expired ? "Venció" : "Vence", formatCivilDate(subscription.endsOn)],
  ];
  if (nextSubscription)
    details.push(["Siguiente plan", formatCivilDate(nextSubscription.startsOn)]);

  // FIX-082 (Mi plan option A): the end is said once, on the card and in the
  // details; the discount sits under «Renovar mi plan».
  const notices: PlanNotice[] = [];
  if (nextSubscription) {
    notices.push({
      icon: "calendar",
      text: `Tu plan siguiente empieza el ${formatCivilDate(nextSubscription.startsOn)}.`,
      note: `${nextSubscription.planName} · ya está pagado.`,
    });
  }

  const cardState = freeze == null ? null : freezeCardState(freeze, today);
  const window = freezeWindow({
    today,
    termStartsOn: subscription.startsOn,
    termEndsOn: subscription.endsOn,
    queuedPlanStartsOn: data.queuedPlanStartsOn ?? null,
  });
  const canFreeze = !expired && data.canRequestFreeze === true;
  const canRenew = !expired && guestPass === null && nextSubscription == null;
  // Walkthrough finding 98: a paid next Plan already kept the discount.
  // Finding 49: say why, never «fundadora».
  const renewNote =
    founderRenewalDeadline != null
      ? `Renueva antes del ${formatCivilDate(founderRenewalDeadline)} y mantienes tu 15 % de descuento.`
      : `Eliges cuándo empieza el nuevo: entre el ${formatCivilDate(renewalStartsOn)} y el ${formatCivilDate(addCivilDays(renewalStartsOn, nextPlanStartWindowDays - 1))}.`;
  const refused = freeze?.state === "refused";

  return (
    <Screen style={styles.screen}>
      {header}
      <ScrollView contentContainerStyle={styles.content} refreshControl={refreshControl}>
        {guestPass === null ? (
          <SubscriptionHero status={status} subscription={subscription} />
        ) : (
          <View testID="subscription-guest-pass">
            <EmphasisCard
              eyebrow={guestPass.eyebrow}
              note={guestPass.note}
              title={guestPass.title}
            />
          </View>
        )}
        {canRenew ? (
          // Rosa Emma C12: the button and its hint together in a white card.
          <View style={styles.renew} testID="subscription-renew">
            <PrimaryButton label="Renovar mi plan" onPress={() => navigation.navigate("Plans")} />
            <BodyText style={styles.renewNote}>{renewNote}</BodyText>
          </View>
        ) : null}
        {notices.length === 0 ? null : <NoticeList notices={notices} />}
        {freeze == null || cardState === null ? null : (
          <FreezeCard
            freeze={freeze}
            onWithdrawn={(withdrawn) => {
              if (withdrawn) setWithdrawnToast(true);
              void view.refetch();
            }}
            planEndsOn={subscription.endsOn}
            state={cardState}
          />
        )}
        <DetailRows rows={details} title="Detalles" />
        {expired || (guestPass !== null && nextSubscription == null) ? (
          <View>
            <SectionTitle>Elige tu próximo plan</SectionTitle>
            <View style={styles.purchase} testID="subscription-purchase">
              <BodyText style={styles.note}>
                {purchaseNote(studioRules?.plansFromPriceCentavos)}
              </BodyText>
              <PrimaryButton label="Comprar un plan" onPress={() => navigation.navigate("Plans")} />
            </View>
          </View>
        ) : guestPass === null && canFreeze ? (
          <View>
            <SectionTitle>Tu plan</SectionTitle>
            <ActionRows>
              {window.available ? (
                <ActionRow
                  icon="sun"
                  label={refused ? "Pedir otro congelamiento" : "Congelar plan"}
                  note="Hasta 15 días, una vez por plan"
                  onPress={() => navigation.navigate("FreezePlan")}
                />
              ) : (
                <ActionRow icon="sun" label="Congelar plan" note={window.unavailableReason ?? ""} />
              )}
            </ActionRows>
          </View>
        ) : null}
      </ScrollView>
      {withdrawnToast ? (
        <BrandToast onClose={() => setWithdrawnToast(false)} title="Retiramos tu solicitud" />
      ) : null}
    </Screen>
  );
}

function purchaseNote(fromCentavos: number | null | undefined): string {
  const pay = "Puedes pagar en el estudio o desde la app.";
  return fromCentavos === null || fromCentavos === undefined
    ? pay
    : `Paquetes desde ${formatBolivianos(fromCentavos)}. ${pay}`;
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  note: {
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 20,
  },
  purchase: { ...surfaces.card, gap: spacing.md, padding: spacing.lg },
  renew: { ...surfaces.card, gap: spacing.smLg, padding: spacing.mdLg },
  renewNote: {
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
    lineHeight: 18,
    textAlign: "center",
  },
  screen: { gap: spacing.lg },
});
