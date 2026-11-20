import { useGetCurrentClientSubscription, useGetCurrentPayment } from "@pilates/api-contracts";
import { LoadingState, QueryFailure, Screen, ScreenTopBar, spacing } from "@pilates/mobile-core";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback } from "react";
import { BackHandler, StyleSheet } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { PaymentStatusView } from "./payment-status-view";
import { useResendReceipt } from "./use-resend-receipt";

type StatusNavigation = {
  getState: () => { index: number; routeNames: string[] };
  goBack: () => void;
  popToTop: () => void;
  replace: (screen: string) => void;
  navigate: (screen: "Booking" | "HomeTab", params: { screen: "Browse" | "Home" }) => void;
};

/**
 * Returns this stack to its root. Opened from a notification, the result is
 * the stack's only screen, so there is nothing to pop: it gives way to the
 * stack's first screen instead (FIX-090, «POP_TO_TOP was not handled»).
 */
function returnToRoot(navigation: StatusNavigation): void {
  const { index, routeNames } = navigation.getState();
  if (index > 0) navigation.popToTop();
  else if (routeNames[0] !== undefined) navigation.replace(routeNames[0]);
}

export function PaymentStatusScreen() {
  const navigation = useNavigation<StatusNavigation>();
  const fetcher = useClientFetcher();
  const payment = useGetCurrentPayment({ fetcher, query: { refetchOnMount: "always" } });
  const subscription = useGetCurrentClientSubscription({
    fetcher,
    query: { refetchOnMount: "always" },
  });
  const { busy: retrying, error, resend } = useResendReceipt();

  // Leaving for another tab first returns this stack to its root, so Perfil
  // or Reservar is not left on the spent payment without its tab bar.
  const leaveFor = (screen: "Booking" | "HomeTab", target: "Browse" | "Home") => {
    returnToRoot(navigation);
    navigation.navigate(screen, { screen: target });
  };
  const goHome = () => leaveFor("HomeTab", "Home");

  // The result has no back arrow: the Android back button leads home like
  // «Volver al inicio», never to the spent payment screen (MOB-074).
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        returnToRoot(navigation);
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
        <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Tu pago" />
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
        error={error}
        onHome={goHome}
        onPrimary={
          current.state === "confirmed"
            ? () => leaveFor("Booking", "Browse")
            : current.state === "rejected"
              ? () => void resend(current.planId)
              : undefined
        }
        payment={current}
        state={
          current.state === "confirmed" || current.state === "rejected" ? current.state : "pending"
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg, paddingBottom: 0 },
});
