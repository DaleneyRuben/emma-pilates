import { useEffect, useEffectEvent } from "react";
import { AppState } from "react-native";

import type { AuthenticationApi } from "./authentication-api";

/**
 * Walkthrough n.º 4 (C01c2): «Revisa tu correo» asks the server, when it
 * opens and whenever the app returns to the front, whether the email was
 * confirmed meanwhile (in a browser or on another phone). A failed check
 * changes nothing: the screen keeps waiting.
 */
export function useRegistrationConfirmed(
  api: Pick<AuthenticationApi, "readRegistrationStatus">,
  registrationContinuation: string,
  onConfirmed: () => void,
): void {
  const confirmed = useEffectEvent(onConfirmed);

  useEffect(() => {
    let active = true;
    const check = () =>
      void Promise.resolve()
        .then(() => api.readRegistrationStatus(registrationContinuation))
        .then((status) => {
          if (active && status === "verified") confirmed();
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
}
