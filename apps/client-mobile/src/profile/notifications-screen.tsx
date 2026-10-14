import { NotificationsScreen } from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";

import { useClientFetcher } from "../client-fetcher";
import {
  clientNotificationDestination,
  type ClientNotificationRoute,
} from "../notifications/notification-destinations";

type NotificationsNavigation = {
  goBack: () => void;
  navigate: (...route: ClientNotificationRoute) => void;
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
        const route = clientNotificationDestination(notification.destinationType ?? null);
        if (route !== null) navigation.navigate(...route);
      }}
    />
  );
}
