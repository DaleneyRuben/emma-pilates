import { useListPlans, type PlanDto } from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  describePlanTerms,
  LoadingState,
  QueryFailure,
  Screen,
  ScreenTopBar,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { formatBolivianos } from "./plan-format";

type PlansNavigation = {
  goBack: () => void;
  navigate: (screen: "PlanDetail", params: { planId: string }) => void;
};

function planCardPrice(plan: PlanDto): string {
  const price = formatBolivianos(plan.priceCentavos);
  return plan.listPriceCentavos === undefined
    ? price
    : `${price}, antes ${formatBolivianos(plan.listPriceCentavos)}`;
}

function PlanCard({ plan, onPress }: { plan: PlanDto; onPress: () => void }) {
  return (
    <Pressable
      accessibilityHint={planCardPrice(plan)}
      accessibilityLabel={plan.name}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.card}
      testID={`plan-card-${plan.id}`}
    >
      <View style={styles.cardBody}>
        <Text style={styles.planName}>{plan.name}</Text>
        <BodyText>{describePlanTerms(plan)}</BodyText>
      </View>
      <View style={styles.prices}>
        {plan.listPriceCentavos === undefined ? null : (
          <Text style={styles.listPrice}>{formatBolivianos(plan.listPriceCentavos)}</Text>
        )}
        <Text style={styles.price}>{formatBolivianos(plan.priceCentavos)}</Text>
      </View>
    </Pressable>
  );
}

export function PlansScreen() {
  const navigation = useNavigation<PlansNavigation>();
  const fetcher = useClientFetcher();
  const plans = useListPlans({
    fetcher,
    query: { refetchOnMount: "always" },
  });

  return (
    <Screen style={styles.screen}>
      <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Elige tu plan" />
      {plans.isPending ? (
        <LoadingState label="Cargando planes" />
      ) : plans.isError || plans.data.status !== 200 ? (
        <QueryFailure label="No pudimos cargar los planes." onRetry={() => void plans.refetch()} />
      ) : plans.data.data.length === 0 ? (
        <BodyText>Por ahora no hay planes disponibles.</BodyText>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {plans.data.data.map((plan) => (
            <PlanCard
              key={plan.id}
              onPress={() => navigation.navigate("PlanDetail", { planId: plan.id })}
              plan={plan}
            />
          ))}
          <BodyText style={styles.note}>
            Todos los planes se activan al confirmarse el pago en el estudio o desde la app.
          </BodyText>
        </ScrollView>
      )}
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
  list: { gap: spacing.md, paddingBottom: spacing.xxl },
  note: { color: colors.textMuted, fontSize: typography.note },
  planName: {
    color: colors.text,
    fontSize: typography.bodyLarge,
    fontWeight: "500",
  },
  listPrice: {
    color: colors.textSubtle,
    fontSize: typography.note,
    textDecorationLine: "line-through",
  },
  price: {
    color: colors.text,
    fontFamily: "Lora_500Medium",
    fontSize: typography.titleSecondary,
  },
  prices: { alignItems: "flex-end" },
  screen: { gap: spacing.lg },
});
