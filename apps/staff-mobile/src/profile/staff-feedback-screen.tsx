import { deviceFeedbackMetadata, FeedbackScreen } from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";

import { useStaffFetcher } from "../staff-fetcher";

// REL-012: «Envíanos tu opinión» (follow-up 293) from S23 Perfil.
export function StaffFeedbackScreen() {
  const navigation = useNavigation<{ goBack: () => void }>();
  const fetcher = useStaffFetcher();
  const [metadata] = useState(deviceFeedbackMetadata);

  return (
    <FeedbackScreen fetcher={fetcher} metadata={metadata} onBack={() => navigation.goBack()} />
  );
}
