import { useQuoteAssistantClientPlans, type PlanQuoteDto } from "@pilates/api-contracts";
import {
  BackLink,
  BodyText,
  colors,
  describePlanTerms,
  formatBolivianos,
  Heading,
  LoadingState,
  QueryFailure,
  radii,
  Screen,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { TabletGrid } from "./assistant-layout";
import { ClientBanner } from "./client-banner";
import type { ClientContext } from "./client-overview-screen";

type SelectPlanNavigation = {
  goBack: () => void;
  navigate: (screen: "ConfirmCashPayment", params: ClientContext & { quote: PlanQuoteDto }) => void;
};

export function SelectPlanScreen({ route }: { route: { params: ClientContext } }) {
  const { clientId, clientName } = route.params;
  const navigation = useNavigation<SelectPlanNavigation>();
  const fetcher = useStaffFetcher();
  const quotes = useQuoteAssistantClientPlans(clientId, {
    fetcher,
    query: { refetchOnMount: "always" },
  });

  const header = (
    <>
      <BackLink onPress={() => navigation.goBack()} />
      <Heading accessibilityLabel="Elige un plan">Elige un plan</Heading>
      <ClientBanner action="Registrando pago para" clientName={clientName} />
    </>
  );

  if (quotes.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando planes" />
      </Screen>
    );
  }
  if (quotes.isError || quotes.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure label="No pudimos cargar los planes." onRetry={() => void quotes.refetch()} />
      </Screen>
    );
  }

  const { creditAvailableCentavos, plans } = quotes.data.data;

  return (
    <Screen style={styles.screen}>
      {header}
      {creditAvailableCentavos > 0 ? (
        <View style={styles.credit}>
          <Text style={styles.creditText}>
            {`Este cliente tiene ${formatBolivianos(creditAvailableCentavos)} de crédito disponible.`}
          </Text>
        </View>
      ) : null}
      <ScrollView contentContainerStyle={styles.list}>
        <TabletGrid testID="assistant-plan-grid">
          {plans.map((plan) => (
            <Pressable
              accessibilityLabel={plan.name}
              accessibilityRole="button"
              key={plan.id}
              onPress={() =>
                navigation.navigate("ConfirmCashPayment", {
                  clientId,
                  clientName,
                  quote: plan,
                })
              }
              style={styles.card}
              testID={`select-plan-${plan.id}`}
            >
              <View style={styles.cardBody}>
                <Text style={styles.planName}>{plan.name}</Text>
                <BodyText>{describePlanTerms(plan)}</BodyText>
              </View>
              <View style={styles.prices}>
                {plan.listPriceCentavos === undefined ? null : (
                  <Text style={styles.originalPrice}>
                    {formatBolivianos(plan.listPriceCentavos)}
                  </Text>
                )}
                {plan.creditAppliedCentavos > 0 ? (
                  <Text style={styles.originalPrice}>{formatBolivianos(plan.priceCentavos)}</Text>
                ) : null}
                <Text style={styles.price}>{formatBolivianos(plan.amountDueCentavos)}</Text>
              </View>
            </Pressable>
          ))}
        </TabletGrid>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    ...surfaces.card,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
  },
  cardBody: { flex: 1, gap: spacing.xs },
  credit: {
    backgroundColor: "rgba(124,148,115,0.14)",
    borderRadius: radii.inset,
    padding: spacing.md,
  },
  creditText: { color: colors.successText, fontSize: typography.note, fontWeight: "600" },
  list: { paddingBottom: spacing.xxl },
  originalPrice: {
    color: colors.textSubtle,
    fontSize: typography.note,
    textDecorationLine: "line-through",
  },
  planName: { color: colors.text, fontSize: typography.bodyLarge, fontWeight: "500" },
  price: { color: colors.text, fontFamily: "Lora_500Medium", fontSize: typography.titleSecondary },
  prices: { alignItems: "flex-end" },
  screen: { gap: spacing.lg },
});
