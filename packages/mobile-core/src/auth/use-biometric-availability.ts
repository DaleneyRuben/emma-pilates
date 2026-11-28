import { useEffect, useReducer, useState } from "react";
import { AppState } from "react-native";

import { reportRecoveredError } from "../monitoring/error-reporting";
import type { SessionManager } from "./session-manager";

export type BiometricAvailability = {
  /** The phone has Face ID or a fingerprint for this app: Perfil shows the switch. */
  available: boolean;
  /** Supported, but the system refuses them to the app now (Settings, lockout). */
  blockedBySystem: boolean;
  /** iOS: the app's own Face ID permission is off; only Settings turns it on. */
  permissionRefused: boolean;
};

/**
 * iOS answers «cannot use» while the app's Face ID permission is off or Face
 * ID is locked out, not only on a phone without it. A phone seen to support
 * biometrics (or that was offered them) keeps Perfil's switch, so the person
 * can turn them on later; the answer is read again on every return to the app.
 */
export function useBiometricAvailability(manager: SessionManager): BiometricAvailability {
  const [checks, recheck] = useReducer((count: number) => count + 1, 0);
  const [seen, setSeen] = useState(false);
  const [refused, setRefused] = useState(false);
  const usable = manager.canUseBiometrics();

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") recheck();
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let active = true;
    if (!usable) {
      manager
        .isBiometricRefusedBySystem?.()
        .then((answer) => {
          if (active) setRefused(answer);
        })
        .catch(reportRecoveredError);
    }
    const answer = usable
      ? Promise.resolve(manager.rememberBiometricSupport?.()).then(() => true)
      : Promise.resolve(manager.wasBiometricSupportSeen?.());
    answer
      .then((wasSeen) => {
        if (active && wasSeen === true) setSeen(true);
      })
      .catch(reportRecoveredError);
    return () => {
      active = false;
    };
    // Every return to the app reads the answers again: Settings may have changed them.
  }, [checks, manager, usable]);

  const permissionRefused = !usable && refused;
  return {
    available: usable || seen || permissionRefused,
    blockedBySystem: !usable && (seen || permissionRefused),
    permissionRefused,
  };
}
