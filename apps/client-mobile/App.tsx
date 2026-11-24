import {
  createDefaultMobileRuntime,
  createNativeCredentialStore,
  createNativePendingRegistrationStore,
  MobileApplication,
  type MobileRuntime,
} from "@pilates/mobile-core";
import { useMemo } from "react";

import { ClientNavigation } from "./src/navigation";
import { useTabletOrientation } from "./src/tablet-orientation";

export default function App({ runtime }: { runtime?: MobileRuntime }) {
  useTabletOrientation();
  const mobileRuntime = useMemo(
    () =>
      runtime ??
      createDefaultMobileRuntime({
        acceptedIdentityKind: "client",
        credentialStore: createNativeCredentialStore("client"),
        pendingRegistrationStore: createNativePendingRegistrationStore("client"),
      }),
    [runtime],
  );

  return <MobileApplication Navigation={ClientNavigation} runtime={mobileRuntime} />;
}
