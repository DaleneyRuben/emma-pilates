import {
  getGetCurrentClientSubscriptionQueryKey,
  useGetCurrentClientSubscription,
} from "@pilates/api-contracts";
import {
  addCivilDays,
  BodyText,
  colors,
  formatBolivianos,
  LoadingState,
  nextPlanStartWindowDays,
  OutlinedButton,
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
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { FreezeRequest } from "./freeze-request";
import { formatCivilDate, formatCivilDateWithYear } from "../home/home-format";
import { DetailRows, SubscriptionHero } from "./subscription-parts";

type SubscriptionNavigation = {
  goBack: () => void;
  navigate: (screen: "Booking" | "Plans", params?: { screen: "Browse" }) => void;
};

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

  const header = (
    <>
      <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Mi plan" />
    </>
  );

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

  const {
    status,
    subscription,
    nextSubscription,
    founderRenewalDeadline,
    freeze,
    canRequestFreeze,
  } = view.data.data;

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
  const renewalStartsOn = view.data.data.renewalStartsOn ?? dayAfter(subscription.endsOn);
  const details: [string, string][] = [
    ["Empezó", formatCivilDate(subscription.startsOn)],
    [expired ? "Venció" : "Vence", formatCivilDate(subscription.endsOn)],
  ];
  if (nextSubscription)
    details.push(["Siguiente plan", formatCivilDate(nextSubscription.startsOn)]);

  return (
    <Screen style={styles.screen}>
      {header}
      <ScrollView contentContainerStyle={styles.content} refreshControl={refreshControl}>
        {founderRenewalDeadline == null ? null : (
          <Notice>{`Renueva antes del ${formatCivilDateWithYear(founderRenewalDeadline)}.`}</Notice>
        )}
        {status === "expiring_soon" ? (
          <Notice note="Renueva cuando quieras y elige tu fecha de inicio.">
            {`Tu plan vence el ${formatCivilDate(subscription.endsOn)}.`}
          </Notice>
        ) : null}
        <SubscriptionHero status={status} subscription={subscription} />
        <DetailRows rows={details} title="Detalles" />
        {subscription.extraClassesLine ? (
          <BodyText style={styles.note}>{subscription.extraClassesLine}</BodyText>
        ) : null}
        {freeze?.state === "approved" ? (
          <Notice>{`Tu plan está congelado hasta el ${formatCivilDateWithYear(freeze.endsOn)}.`}</Notice>
        ) : null}
        {freeze?.state === "requested" ? (
          <BodyText>Tu solicitud de congelamiento está en revisión.</BodyText>
        ) : null}
        {canRequestFreeze && subscription !== undefined ? (
          <FreezeRequest onRequested={() => void view.refetch()} subscriptionId={subscription.id} />
        ) : null}
        {expired ? (
          <View style={styles.section}>
            <SectionTitle>Elige tu próximo plan</SectionTitle>
            <BodyText style={styles.note}>
              {purchaseNote(studioRules?.plansFromPriceCentavos)}
            </BodyText>
            <PrimaryButton label="Comprar un plan" onPress={() => navigation.navigate("Plans")} />
          </View>
        ) : nextSubscription ? null : (
          <View style={styles.section}>
            <SectionTitle>Renovación anticipada</SectionTitle>
            <OutlinedButton label="Renovar mi plan" onPress={() => navigation.navigate("Plans")} />
            <BodyText style={styles.note}>
              {`Eliges cuándo empieza el nuevo: entre el ${formatCivilDate(renewalStartsOn)}, al día siguiente de que venza este, y el ${formatCivilDate(addCivilDays(renewalStartsOn, nextPlanStartWindowDays - 1))}.`}
            </BodyText>
          </View>
        )}
      </ScrollView>
      {expired ? null : (
        <View style={styles.footer}>
          <PrimaryButton
            label="Reservar una clase"
            onPress={() => navigation.navigate("Booking", { screen: "Browse" })}
          />
        </View>
      )}
    </Screen>
  );
}

function dayAfter(civilDate: string): string {
  const date = new Date(`${civilDate}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function purchaseNote(fromCentavos: number | null | undefined): string {
  const pay = "Puedes pagar en el estudio o desde la app.";
  return fromCentavos === null || fromCentavos === undefined
    ? pay
    : `Paquetes desde ${formatBolivianos(fromCentavos)}. ${pay}`;
}

function Notice({ children, note }: { children: string; note?: string }) {
  return (
    <View style={styles.notice}>
      <Text style={styles.noticeText}>{children}</Text>
      {note === undefined ? null : <BodyText style={styles.noticeNote}>{note}</BodyText>}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingBottom: spacing.lg },
  footer: { paddingBottom: spacing.sm, paddingTop: spacing.sm },
  note: { color: colors.textMuted, fontSize: typography.note },
  notice: {
    backgroundColor: colors.primaryTint,
    borderRadius: 14,
    gap: spacing.xxs,
    padding: spacing.lg,
  },
  noticeNote: { color: colors.primaryOnTint, fontSize: typography.note },
  noticeText: { color: colors.primaryOnTint, fontSize: typography.body, fontWeight: "600" },
  screen: { gap: spacing.lg },
  section: { gap: spacing.sm },
});
