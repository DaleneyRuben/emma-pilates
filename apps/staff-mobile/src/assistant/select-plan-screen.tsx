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

  // Credit is retired (PAY-005): every Plan is collected at its full price.
  const { plans } = quotes.data.data;

  return (
    <Screen style={styles.screen}>
      {header}
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
              <Text style={styles.price}>{formatBolivianos(plan.priceCentavos)}</Text>
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
  list: { paddingBottom: spacing.xxl },
  planName: { color: colors.text, fontSize: typography.bodyLarge, fontWeight: "500" },
  price: { color: colors.text, fontFamily: "Lora_500Medium", fontSize: typography.titleSecondary },
  screen: { gap: spacing.lg },
});
