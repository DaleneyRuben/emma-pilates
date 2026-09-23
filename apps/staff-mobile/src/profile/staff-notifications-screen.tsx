import { NotificationsScreen } from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";

import { useStaffFetcher } from "../staff-fetcher";

// Mi agenda is the root of the Trainer and Nutritionist stacks.
const agendaDestinations = new Set(["trainer_schedule", "nutritionist_agenda"]);

export function StaffNotificationsScreen() {
  const navigation = useNavigation<{
    goBack: () => void;
    popToTop: () => void;
  }>();
  const fetcher = useStaffFetcher();

  return (
    <NotificationsScreen
      emptySupport="Te avisaremos aquí cuando haya algo que necesite tu atención."
      fetcher={fetcher}
      onBack={() => navigation.goBack()}
      onOpen={(notification) => {
        if (agendaDestinations.has(notification.destinationType ?? "")) {
          navigation.popToTop();
        }
      }}
    />
  );
}
