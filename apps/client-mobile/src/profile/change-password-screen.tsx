import { ChangePasswordScreen } from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";

import { useClientFetcher } from "../client-fetcher";
import type { ProfileParams } from "./profile-screen";

type ChangePasswordNavigation = {
  goBack: () => void;
  navigate: (screen: "Profile", params: ProfileParams) => void;
};

export function ClientChangePasswordScreen() {
  const navigation = useNavigation<ChangePasswordNavigation>();
  const fetcher = useClientFetcher();

  return (
    <ChangePasswordScreen
      fetcher={fetcher}
      onBack={() => navigation.goBack()}
      onSaved={() => navigation.navigate("Profile", { passwordChanged: true })}
    />
  );
}
