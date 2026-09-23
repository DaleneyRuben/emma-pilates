import { NotificationsScreen } from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";

import { useClientFetcher } from "../client-fetcher";

type NotificationsNavigation = {
  goBack: () => void;
  navigate: (
    screen: "Subscription" | "Bookings" | "PaymentStatus" | "MyEvaluations",
    params?: { screen: "MyBookings" },
  ) => void;
};

export function ClientNotificationsScreen() {
  const navigation = useNavigation<NotificationsNavigation>();
  const fetcher = useClientFetcher();

  return (
    <NotificationsScreen
      emptySupport="Aquí te avisaremos sobre tus clases, pagos y evaluaciones."
      fetcher={fetcher}
      onBack={() => navigation.goBack()}
      onOpen={(notification) => {
        if (notification.destinationType === "subscription") {
          navigation.navigate("Subscription");
        } else if (notification.destinationType === "evaluation") {
          navigation.navigate("MyEvaluations");
        } else if (
          notification.destinationType === "booking" ||
          // A cancelled Session has no detail to open; its Bookings do.
          notification.destinationType === "session"
        ) {
          navigation.navigate("Bookings", { screen: "MyBookings" });
        } else if (notification.destinationType === "payment") {
          navigation.navigate("PaymentStatus");
        }
      }}
    />
  );
}
