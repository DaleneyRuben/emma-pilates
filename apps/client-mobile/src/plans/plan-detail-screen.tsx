import { useGetPlan } from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  Heading,
  PrimaryButton,
  QueryFailure,
  radii,
  Screen,
  spacing,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { BackLink } from "../ui/back-link";
import { describeValidity, formatBolivianos } from "./plan-format";

const validityCopy = (durationMonths: number): string =>
  durationMonths === 1
    ? "Un mes de vigencia desde que se confirma tu pago."
    : `${durationMonths} meses de vigencia desde que se confirma tu pago.`;

export function PlanDetailScreen({
  route,
}: {
  route: { params: { planId: string } };
}) {
  const navigation = useNavigation<{ goBack: () => void }>();
  const fetcher = useClientFetcher();
  const plan = useGetPlan(route.params.planId, {
    fetcher,
    query: { refetchOnMount: "always" },
  });

  if (plan.isPending) {
    return (
      <Screen style={styles.screen}>
        <BackLink onPress={() => navigation.goBack()} />
        <Heading accessibilityLabel="Detalle del plan">Detalle del plan</Heading>
        <BodyText accessibilityLabel="Cargando plan">Cargando…</BodyText>
      </Screen>
    );
  }

  if (plan.isError || plan.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        <BackLink onPress={() => navigation.goBack()} />
        <Heading accessibilityLabel="Detalle del plan">Detalle del plan</Heading>
        <QueryFailure
          label="No pudimos cargar el plan."
          onRetry={() => void plan.refetch()}
        />
      </Screen>
    );
  }

  const detail = plan.data.data;
  const price = formatBolivianos(detail.priceCentavos);

  return (
    <Screen style={styles.screen}>
      <BackLink onPress={() => navigation.goBack()} />
      <Heading accessibilityLabel="Detalle del plan">Detalle del plan</Heading>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.planName}>{detail.name}</Text>
          <BodyText>{describeValidity(detail.durationMonths)}</BodyText>
          <Text style={styles.price}>{price}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Qué incluye</Text>
          <BodyText>{`${detail.classAllowance} clases en cualquier sucursal del estudio.`}</BodyText>
          <BodyText>
            Cancelación sin costo hasta 2 h 30 antes de cada clase.
          </BodyText>
          <BodyText>{validityCopy(detail.durationMonths)}</BodyText>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Desglose</Text>
          <View style={styles.row}>
            <BodyText>Precio del plan</BodyText>
            <BodyText>{price}</BodyText>
          </View>
          <View style={[styles.row, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total a pagar</Text>
            <Text style={styles.total}>{price}</Text>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Siguiente paso</Text>
          <BodyText>
            El plan se activa cuando el estudio confirma tu pago. Recibirás un
            aviso en la app.
          </BodyText>
        </View>
        <PrimaryButton disabled label="Continuar al pago" />
        <BodyText style={styles.note}>
          El pago desde la app estará disponible próximamente. Puedes pagar en el
          estudio.
        </BodyText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  content: { gap: spacing.xl, paddingBottom: spacing.xxl },
  note: { color: colors.textMuted, fontSize: typography.note },
  planName: {
    color: colors.text,
    fontSize: typography.titleSecondary,
    fontWeight: "500",
  },
  price: {
    color: colors.text,
    fontFamily: "Lora_500Medium",
    fontSize: typography.price,
    marginTop: spacing.sm,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  screen: { gap: spacing.lg },
  section: { gap: spacing.sm },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.bodyLarge,
    fontWeight: "500",
  },
  total: {
    color: colors.text,
    fontFamily: "Lora_500Medium",
    fontSize: typography.titleSecondary,
  },
  totalLabel: {
    color: colors.text,
    fontSize: typography.bodyLarge,
    fontWeight: "500",
  },
  totalRow: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: spacing.sm,
  },
});
