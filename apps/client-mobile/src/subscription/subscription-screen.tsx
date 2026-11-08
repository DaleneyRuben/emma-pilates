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
  formatBolivianos,
  LoadingState,
  nextPlanStartWindowDays,
  PrimaryButton,
  QueryFailure,
  Screen,
  ScreenTopBar,
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
 * C12 Mi plan on DES-015's option A (follow-up 259, findings 51 and 54): the
 * plan card is the one colour; notices are an unfilled list; the Freeze is a
 * neutral card; renewing and freezing are rows. Reservar lives on the tab bar.
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
        <BodyText>Aún no tienes un plan. Elige el paquete que mejor te acomode.</BodyText>
        <PrimaryButton label="Comprar un plan" onPress={() => navigation.navigate("Plans")} />
      </Screen>
    );
  }

  const expired = status === "expired";
  const today = boliviaCivilDate(new Date());
  const renewalStartsOn = data.renewalStartsOn ?? addCivilDays(subscription.endsOn, 1);
  const details: [string, string][] = [
    ["Empezó", formatCivilDate(subscription.startsOn)],
    [expired ? "Venció" : "Vence", formatCivilDate(subscription.endsOn)],
  ];
  if (nextSubscription)
    details.push(["Siguiente plan", formatCivilDate(nextSubscription.startsOn)]);

  const notices: PlanNotice[] = [];
  if (founderRenewalDeadline != null) {
    // Finding 49: say why, never «fundadora».
    notices.push({
      icon: "tag",
      text: `Renueva antes del ${formatCivilDate(founderRenewalDeadline)} para mantener tu 15 % de descuento.`,
      note: "Tu plan nuevo puede empezar más tarde: lo que cuenta es la fecha de compra.",
    });
  }
  if (status === "expiring_soon") {
    notices.push({
      icon: "clock",
      text: `Tu plan vence el ${formatCivilDate(subscription.endsOn)}.`,
      note: "Renueva cuando quieras y elige tu fecha de inicio.",
    });
  }
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
  const refused = freeze?.state === "refused";

  return (
    <Screen style={styles.screen}>
      {header}
      <ScrollView contentContainerStyle={styles.content} refreshControl={refreshControl}>
        <SubscriptionHero status={status} subscription={subscription} />
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
        {subscription.extraClassesLine ? (
          <BodyText style={styles.note}>{subscription.extraClassesLine}</BodyText>
        ) : null}
        {expired ? (
          <View style={styles.section}>
            <SectionTitle>Elige tu próximo plan</SectionTitle>
            <BodyText style={styles.note}>
              {purchaseNote(studioRules?.plansFromPriceCentavos)}
            </BodyText>
            <PrimaryButton label="Comprar un plan" onPress={() => navigation.navigate("Plans")} />
          </View>
        ) : nextSubscription == null || canFreeze ? (
          <View>
            <SectionTitle>Tu plan</SectionTitle>
            <ActionRows>
              {nextSubscription == null ? (
                <ActionRow
                  icon="refresh"
                  label="Renovar mi plan"
                  note={`Eliges cuándo empieza el nuevo: entre el ${formatCivilDate(renewalStartsOn)}, al día siguiente de que venza este, y el ${formatCivilDate(addCivilDays(renewalStartsOn, nextPlanStartWindowDays - 1))}.`}
                  onPress={() => navigation.navigate("Plans")}
                />
              ) : null}
              {!canFreeze ? null : window.available ? (
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
  content: { gap: spacing.xl, paddingBottom: spacing.lg },
  note: { color: colors.textMuted, fontSize: typography.note },
  screen: { gap: spacing.lg },
  section: { gap: spacing.md },
});
