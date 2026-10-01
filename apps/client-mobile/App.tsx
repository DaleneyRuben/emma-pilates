import {
  createDefaultMobileRuntime,
  createNativeCredentialStore,
  createNativePendingRegistrationStore,
  MobileApplication,
  type MobileRuntime,
} from "@pilates/mobile-core";
import { useMemo } from "react";

import { ClientNavigation } from "./src/navigation";

export default function App({ runtime }: { runtime?: MobileRuntime }) {
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

  return (
    <MobileApplication
      Navigation={ClientNavigation}
      runtime={mobileRuntime}
    />
  );
}
