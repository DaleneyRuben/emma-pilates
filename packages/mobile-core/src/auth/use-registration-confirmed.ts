import { useEffect, useEffectEvent, useState } from "react";
import { AppState } from "react-native";

import type { AuthenticationApi } from "./authentication-api";

/**
 * Walkthrough n.º 4 (C01c2): «Revisa tu correo» asks the server, when it
 * opens and whenever the app returns to the front, whether the email was
 * confirmed meanwhile (in a browser or on another phone). A failed check
 * changes nothing: the screen keeps waiting. Walkthrough n.º 2 (C01c3): it
 * also answers whether the email bounced, so the screen can say so.
 */
export function useRegistrationConfirmed(
  api: Pick<AuthenticationApi, "readRegistrationStatus">,
  registrationContinuation: string,
  onConfirmed: () => void,
): { bounced: boolean } {
  const confirmed = useEffectEvent(onConfirmed);
  const [bounced, setBounced] = useState(false);

  useEffect(() => {
    let active = true;
    const check = () =>
      void Promise.resolve()
        .then(() => api.readRegistrationStatus(registrationContinuation))
        .then((status) => {
          if (!active) return;
          if (status === "verified") confirmed();
          setBounced(status === "bounced");
        })
        .catch(() => undefined);

    check();
    const foreground = AppState.addEventListener?.("change", (state) => {
      if (state === "active") check();
    });

    return () => {
      active = false;
      foreground?.remove();
    };
  }, [api, registrationContinuation]);

  return { bounced };
}
