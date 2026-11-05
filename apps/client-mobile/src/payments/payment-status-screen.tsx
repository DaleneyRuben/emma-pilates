import { useGetCurrentClientSubscription, useGetCurrentPayment } from "@pilates/api-contracts";
import {
  BackLink,
  BodyText,
  colors,
  LoadingState,
  QueryFailure,
  Screen,
  spacing,
} from "@pilates/mobile-core";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback } from "react";
import { BackHandler, StyleSheet } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { PaymentStatusView } from "./payment-status-view";
import { useResendReceipt } from "./use-resend-receipt";

type StatusNavigation = {
  goBack: () => void;
  navigate: (screen: "Booking" | "HomeTab", params: { screen: "Browse" | "Home" }) => void;
};

export function PaymentStatusScreen() {
  const navigation = useNavigation<StatusNavigation>();
  const fetcher = useClientFetcher();
  const payment = useGetCurrentPayment({ fetcher, query: { refetchOnMount: "always" } });
  const subscription = useGetCurrentClientSubscription({
    fetcher,
    query: { refetchOnMount: "always" },
  });
  const { busy: retrying, error, resend } = useResendReceipt();

  const goHome = () => navigation.navigate("HomeTab", { screen: "Home" });

  // The result has no back arrow: the Android back button leads home like
  // «Volver al inicio», never to the spent payment screen (MOB-074).
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        navigation.navigate("HomeTab", { screen: "Home" });
        return true;
      });
      return () => subscription.remove();
    }, [navigation]),
  );

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

  return (
    <Screen style={styles.screen}>
      <PaymentStatusView
        busy={retrying}
        endsOn={active?.endsOn}
        onHome={goHome}
        onPrimary={
          current.state === "confirmed"
            ? () => navigation.navigate("Booking", { screen: "Browse" })
            : current.state === "rejected"
              ? () => void resend(current.planId)
              : undefined
        }
        payment={current}
        state={
          current.state === "confirmed" || current.state === "rejected" ? current.state : "pending"
        }
      />
      {error === null ? null : (
        <BodyText accessibilityRole="alert" style={styles.error}>
          {error}
        </BodyText>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.errorText, textAlign: "center" },
  screen: { gap: spacing.lg },
});
