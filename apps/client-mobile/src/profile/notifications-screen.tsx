import { NotificationsScreen } from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";

import { useClientFetcher } from "../client-fetcher";
import {
  clientNotificationAction,
  type ClientNotificationActionRoute,
} from "../notifications/notification-actions";
import {
  clientNotificationDestination,
  type ClientNotificationRoute,
} from "../notifications/notification-destinations";

type NotificationsNavigation = {
  goBack: () => void;
  navigate: (
    ...route:
      ClientNotificationRoute | ClientNotificationActionRoute | ["HomeTab", { screen: "Home" }]
  ) => void;
};

export function ClientNotificationsScreen() {
  const navigation = useNavigation<NotificationsNavigation>();
  const fetcher = useClientFetcher();

  return (
    <NotificationsScreen
      actionFor={(notification) => {
        const action = clientNotificationAction(notification);
        return action === null
          ? null
          : { label: action.label, onPress: () => navigation.navigate(...action.route) };
      }}
      emptyAction={{
        label: "Volver al inicio",
        onPress: () => navigation.navigate("HomeTab", { screen: "Home" }),
      }}
      emptySupport="Aquí te avisaremos sobre tus clases, pagos y evaluaciones."
      fetcher={fetcher}
      onBack={() => navigation.goBack()}
      onOpen={(notification) => {
        const route = clientNotificationDestination(notification.destinationType ?? null);
        if (route !== null) navigation.navigate(...route);
      }}
    />
  );
}
