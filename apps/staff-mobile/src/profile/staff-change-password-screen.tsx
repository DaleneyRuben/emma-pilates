import { ChangePasswordScreen } from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";

import { useStaffFetcher } from "../staff-fetcher";

export function StaffChangePasswordScreen() {
  const navigation = useNavigation<{ goBack: () => void }>();
  const fetcher = useStaffFetcher();

  return (
    <ChangePasswordScreen
      fetcher={fetcher}
      onBack={() => navigation.goBack()}
      onSaved={() => navigation.goBack()}
    />
  );
}
