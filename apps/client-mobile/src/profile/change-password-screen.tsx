import { ChangePasswordScreen } from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";

import { useClientFetcher } from "../client-fetcher";

export function ClientChangePasswordScreen() {
  const navigation = useNavigation<{ goBack: () => void }>();
  const fetcher = useClientFetcher();

  return (
    <ChangePasswordScreen
      fetcher={fetcher}
      onBack={() => navigation.goBack()}
      onSaved={() => navigation.goBack()}
    />
  );
}
