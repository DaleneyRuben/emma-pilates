import {
  createDefaultMobileRuntime,
  createNativeCredentialStore,
  MobileApplication,
  type MobileRuntime,
} from "@pilates/mobile-core";
import { useMemo } from "react";

import { StaffNavigation } from "./src/navigation";

export default function App({ runtime }: { runtime?: MobileRuntime }) {
  const mobileRuntime = useMemo(
    () =>
      runtime ??
      createDefaultMobileRuntime({
        acceptedIdentityKind: "staff",
        credentialStore: createNativeCredentialStore("staff"),
      }),
    [runtime],
  );

  return <MobileApplication Navigation={StaffNavigation} runtime={mobileRuntime} />;
}
