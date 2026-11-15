import { ChangePasswordScreen } from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";

import { useStaffFetcher } from "../staff-fetcher";
import type { StaffProfileParams } from "./staff-profile-screen";

type ChangePasswordNavigation = {
  goBack: () => void;
  navigate: (screen: "Profile", params: StaffProfileParams) => void;
};

export function StaffChangePasswordScreen() {
  const navigation = useNavigation<ChangePasswordNavigation>();
  const fetcher = useStaffFetcher();

  return (
    <ChangePasswordScreen
      fetcher={fetcher}
      onBack={() => navigation.goBack()}
      onSaved={() => navigation.navigate("Profile", { passwordChanged: true })}
    />
  );
}
