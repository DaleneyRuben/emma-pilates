import {
  useGetAssistantClientOverview,
  useQuoteAssistantClientPlans,
  type PlanQuoteDto,
  formatMoney,
} from "@pilates/api-contracts";
import {
  Chevron,
  describePlanCardLabel,
  describePlanTerms,
  SectionTitle,
  LoadingState,
  QueryFailure,
  Screen,
  spacing,
  surfaces,
  Text,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { bodyScroll, RowCard } from "../ui/card-pieces";
import { useStaffFetcher } from "../staff-fetcher";
import { BackBar } from "../ui/back-bar";
import { useIsTablet } from "../ui/use-is-tablet";
import { TabletGrid } from "./assistant-layout";
import { ClientBanner } from "./client-banner";
import type { ClientContext } from "./client-overview-screen";

type SelectPlanNavigation = {
  goBack: () => void;
  navigate: (
    screen: "ConfirmCashPayment",
    params: ClientContext & { quote: PlanQuoteDto; renewalStartsOn?: string },
  ) => void;
};

export function SelectPlanScreen({ route }: { route: { params: ClientContext } }) {
  const { clientId, clientName, clientPhoto } = route.params;
  const navigation = useNavigation<SelectPlanNavigation>();
  const fetcher = useStaffFetcher();
  const tablet = useIsTablet();
  // FIX-019: S10 names the fixed renewal start from the overview, so the Plans
  // wait for it; without it a renewal would offer dates the server ignores.
  const overview = useGetAssistantClientOverview(clientId, { fetcher });
  const quotes = useQuoteAssistantClientPlans(clientId, {
    fetcher,
    query: { refetchOnMount: "always" },
  });

  const back = <BackBar onBack={() => navigation.goBack()} title="Elige un plan" />;
  const banner = (
    <ClientBanner
      action="Registrando pago para"
      clientName={clientName}
      clientPhoto={clientPhoto}
    />
  );

  if (quotes.isPending || overview.isPending) {
    return (
      <Screen style={[styles.screen, styles.gapped]}>
        {back}
        {banner}
        <LoadingState label="Cargando planes" />
      </Screen>
    );
  }
  if (
    quotes.isError ||
    quotes.data.status !== 200 ||
    overview.data === undefined ||
    overview.data.status !== 200
  ) {
    const retry = () => {
      void quotes.refetch();
      void overview.refetch();
    };
    return (
      <Screen style={[styles.screen, styles.gapped]}>
        {back}
        {banner}
        <QueryFailure label="No pudimos cargar los planes." onRetry={retry} />
      </Screen>
    );
  }

  const { renewalStartsOn } = overview.data.data.subscription;

  // Credit is retired (PAY-005): every Plan is collected at its full price.
  const { plans } = quotes.data.data;

  const rows = plans.map((plan) => (
    <Pressable
      accessibilityLabel={describePlanCardLabel(plan)}
      accessibilityRole="button"
      key={plan.id}
      onPress={() =>
        navigation.navigate("ConfirmCashPayment", {
          clientId,
          clientName,
          clientPhoto,
          quote: plan,
          ...(renewalStartsOn === undefined ? {} : { renewalStartsOn }),
        })
      }
      style={({ pressed }) => [styles.row, tablet && styles.card, pressed && styles.pressed]}
      testID={`select-plan-${plan.id}`}
    >
      <View style={styles.rowBody}>
        <Text variant="titulo-fila">{plan.name}</Text>
        <Text variant="secundario">{describePlanTerms(plan)}</Text>
      </View>
      <View style={styles.prices}>
        {plan.listPriceCentavos === undefined ? null : (
          <Text strike variant="secundario">
            {formatMoney(plan.listPriceCentavos)}
          </Text>
        )}
        <Text variant="cifra">{formatMoney(plan.priceCentavos)}</Text>
      </View>
      <Chevron size={16} strokeWidth={1.5} tone="muted" />
    </Pressable>
  ));

  // E-P01: on a phone the Plans are rows of one white card under its label;
  // a tablet keeps a grid of cards.
  return (
    <Screen style={styles.screen}>
      {back}
      <ScrollView contentContainerStyle={bodyScroll.content} style={bodyScroll.scroll}>
        {banner}
        {tablet ? (
          <>
            <SectionTitle>Planes disponibles</SectionTitle>
            <TabletGrid testID="assistant-plan-grid">{rows}</TabletGrid>
          </>
        ) : (
          <RowCard label="Planes disponibles" testID="assistant-plan-grid">
            {rows}
          </RowCard>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: surfaces.card,
  gapped: { gap: spacing.md },
  pressed: { opacity: 0.7 },
  prices: { alignItems: "flex-end" },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowBody: { flex: 1, gap: spacing.xxs },
  screen: { paddingHorizontal: spacing.xlSm },
});
