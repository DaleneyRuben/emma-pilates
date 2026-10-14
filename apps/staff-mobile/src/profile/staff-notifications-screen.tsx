import { NotificationsScreen, useMobileIdentity } from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";

import {
  staffNotificationDestination,
  type StaffNotificationRoute,
} from "../notifications/notification-destinations";
import { useStaffFetcher } from "../staff-fetcher";

export function StaffNotificationsScreen() {
  const navigation = useNavigation<{
    goBack: () => void;
    navigate: (...route: StaffNotificationRoute) => void;
  }>();
  const fetcher = useStaffFetcher();
  const role = useMobileIdentity().session?.role;

  return (
    <NotificationsScreen
      emptySupport="Te avisaremos aquí cuando haya algo que necesite tu atención."
      fetcher={fetcher}
      onBack={() => navigation.goBack()}
      onOpen={(notification) => {
        if (role === undefined || role === "client") return;
        const route = staffNotificationDestination(
          role,
          notification.destinationType ?? null,
          notification.destinationId ?? null,
        );
        if (route !== null) navigation.navigate(...route);
      }}
    />
  );
}
