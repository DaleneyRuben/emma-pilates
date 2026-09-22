import { NotificationsScreen } from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";

import { useStaffFetcher } from "../staff-fetcher";

export function StaffNotificationsScreen() {
  const navigation = useNavigation<{ goBack: () => void }>();
  const fetcher = useStaffFetcher();

  return (
    <NotificationsScreen
      emptySupport="Te avisaremos aquí cuando haya algo que necesite tu atención."
      fetcher={fetcher}
      onBack={() => navigation.goBack()}
    />
  );
}
