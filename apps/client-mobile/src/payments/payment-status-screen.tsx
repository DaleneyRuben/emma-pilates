import {
  createPurchaseIntent,
  getGetCurrentPurchaseIntentQueryKey,
  useGetCurrentClientSubscription,
  useGetCurrentPayment,
} from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  Heading,
  LoadingState,
  PrimaryButton,
  QueryFailure,
  radii,
  Screen,
  spacing,
  surfaces,
  TextButton,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { formatCivilDate } from "../home/home-format";
import { useClientFetcher } from "../client-fetcher";
import { BackLink } from "@pilates/mobile-core";

type StatusNavigation = {
  goBack: () => void;
  navigate: (
    screen: "HomeTab" | "Payment",
    params?: { screen: "Home" } | { purchaseIntentId: string },
  ) => void;
};

export function PaymentStatusScreen() {
  const navigation = useNavigation<StatusNavigation>();
  const fetcher = useClientFetcher();
  const queryClient = useQueryClient();
  const payment = useGetCurrentPayment({ fetcher, query: { refetchOnMount: "always" } });
  const subscription = useGetCurrentClientSubscription({
    fetcher,
    query: { refetchOnMount: "always" },
  });
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goHome = () => navigation.navigate("HomeTab", { screen: "Home" });

  if (payment.isPending) {
    return (
      <Screen style={styles.screen}>
        <LoadingState label="Cargando pago" />
      </Screen>
    );
  }
  if (payment.isError || payment.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        <BackLink onPress={() => navigation.goBack()} />
        <QueryFailure label="No encontramos tu pago." onRetry={() => void payment.refetch()} />
      </Screen>
    );
  }

  const current = payment.data.data;
  const active =
    subscription.data?.status === 200 ? (subscription.data.data.subscription ?? null) : null;

  const startAgain = async () => {
    setError(null);
    setRetrying(true);
    try {
      const response = await createPurchaseIntent(
        { planId: current.planId },
        { headers: { "idempotency-key": randomUUID() } },
        fetcher,
      );
      if (response.status !== 201) throw new Error("intent_failed");
      await queryClient.invalidateQueries({ queryKey: getGetCurrentPurchaseIntentQueryKey() });
      navigation.navigate("Payment", { purchaseIntentId: response.data.id });
    } catch {
      setError("No pudimos iniciar un nuevo pago. Inténtalo de nuevo.");
    } finally {
      setRetrying(false);
    }
  };

  if (current.state === "confirmed") {
    return (
      <Screen style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.badge, styles.successBadge]}>
            <Text style={styles.badgeIcon}>✓</Text>
          </View>
          <Heading accessibilityLabel="Pago confirmado" style={styles.centered}>
            ¡Pago confirmado!
          </Heading>
          <View style={styles.card}>
            <Text style={styles.planName}>{current.planName}</Text>
            <BodyText>{`${current.classAllowance} clases`}</BodyText>
            {active === null ? null : (
              <BodyText>{`Vigente hasta el ${formatCivilDate(active.endsOn)}`}</BodyText>
            )}
          </View>
          <PrimaryButton label="Ir al inicio" onPress={goHome} />
        </ScrollView>
      </Screen>
    );
  }

  if (current.state === "rejected") {
    return (
      <Screen style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.badge, styles.errorBadge]}>
            <Text style={styles.badgeIcon}>!</Text>
          </View>
          <Heading accessibilityLabel="Comprobante rechazado" style={styles.centered}>
            Tu comprobante fue rechazado
          </Heading>
          <View style={styles.card}>
            <BodyText style={styles.reasonLabel}>Motivo</BodyText>
            <Text style={styles.reason}>{current.rejectionReason}</Text>
          </View>
          <BodyText style={styles.centered}>
            Sube un nuevo comprobante para activar tu plan. Tu crédito volvió a estar disponible.
          </BodyText>
          {error === null ? null : (
            <BodyText accessibilityRole="alert" style={styles.error}>
              {error}
            </BodyText>
          )}
          <PrimaryButton
            busy={retrying}
            label="Subir un nuevo comprobante"
            onPress={() => void startAgain()}
          />
          <TextButton label="Volver al inicio" onPress={goHome} />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.badge, styles.warningBadge]}>
          <Text style={styles.badgeIcon}>⏳</Text>
        </View>
        <Heading accessibilityLabel="Pago en revisión" style={styles.centered}>
          Tu pago está en revisión
        </Heading>
        <BodyText style={styles.centered}>
          Un administrador va a confirmar tu comprobante pronto. Te avisaremos apenas esté listo.
        </BodyText>
        <TextButton label="Volver al inicio" onPress={goHome} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    alignSelf: "center",
    borderRadius: radii.pill,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  badgeIcon: { color: colors.white, fontSize: typography.title },
  card: {
    ...surfaces.card,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  centered: { textAlign: "center" },
  content: { gap: spacing.lg, paddingBottom: spacing.xxl, paddingTop: spacing.xxl },
  error: { color: colors.errorText, textAlign: "center" },
  errorBadge: { backgroundColor: colors.error },
  planName: { color: colors.text, fontSize: typography.titleSecondary, fontWeight: "500" },
  reason: { color: colors.text, fontSize: typography.body },
  reasonLabel: { color: colors.textMuted, fontSize: typography.note },
  screen: { gap: spacing.lg },
  successBadge: { backgroundColor: colors.success },
  warningBadge: { backgroundColor: colors.warning },
});
