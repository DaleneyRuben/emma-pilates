import { useListPlans, type PlanDto } from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  QueryFailure,
  radii,
  Screen,
  ScreenTopBar,
  shadows,
  spacing,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { describePlanTerms, formatBolivianos } from "./plan-format";

type PlansNavigation = {
  goBack: () => void;
  navigate: (screen: "PlanDetail", params: { planId: string }) => void;
};

function PlanCard({ plan, onPress }: { plan: PlanDto; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={plan.name}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.cardBody}>
        <Text style={styles.planName}>{plan.name}</Text>
        <BodyText>
          {describePlanTerms(plan.classAllowance, plan.durationMonths)}
        </BodyText>
      </View>
      <Text style={styles.price}>{formatBolivianos(plan.priceCentavos)}</Text>
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
        <BodyText accessibilityLabel="Cargando planes">Cargando…</BodyText>
      ) : plans.isError || plans.data.status !== 200 ? (
        <QueryFailure
          label="No pudimos cargar los planes."
          onRetry={() => void plans.refetch()}
        />
      ) : plans.data.data.length === 0 ? (
        <BodyText>Por ahora no hay planes disponibles.</BodyText>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {plans.data.data.map((plan) => (
            <PlanCard
              key={plan.id}
              onPress={() =>
                navigation.navigate("PlanDetail", { planId: plan.id })
              }
              plan={plan}
            />
          ))}
          <BodyText style={styles.note}>
            Todos los planes se activan al confirmarse el pago en el estudio o
            desde la app.
          </BodyText>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    ...shadows.card,
  },
  cardBody: { flex: 1, gap: spacing.xs },
  list: { gap: spacing.md, paddingBottom: spacing.xxl },
  note: { color: colors.textMuted, fontSize: typography.note },
  planName: {
    color: colors.text,
    fontSize: typography.bodyLarge,
    fontWeight: "500",
  },
  price: {
    color: colors.text,
    fontFamily: "Lora_500Medium",
    fontSize: typography.titleSecondary,
  },
  screen: { gap: spacing.lg },
});
