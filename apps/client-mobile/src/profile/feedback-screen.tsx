import { deviceFeedbackMetadata, FeedbackScreen } from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";

import { useClientFetcher } from "../client-fetcher";

// REL-012: «Enviar comentarios» from 18 Perfil.
export function ClientFeedbackScreen() {
  const navigation = useNavigation<{ goBack: () => void }>();
  const fetcher = useClientFetcher();
  const [metadata] = useState(deviceFeedbackMetadata);

  return (
    <FeedbackScreen fetcher={fetcher} metadata={metadata} onBack={() => navigation.goBack()} />
  );
}
