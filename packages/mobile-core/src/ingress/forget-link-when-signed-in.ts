import { useEffect } from "react";

import type { AuthenticationLinkIntent } from "./verified-link";

// The links the sign-in flow opens. An email change link is confirmed signed
// in or not (FIX-039), so it stays for the navigation to handle.
const signInLinks = new Set<AuthenticationLinkIntent["type"]>([
  "verify-email",
  "activate-account",
  "recover-password",
]);

/**
 * A sign-in link that arrives or remains while she is signed in has nothing
 * to open, so it is forgotten instead of opening once she signs out
 * (walkthrough n.º 17).
 */
export function useForgetLinkWhenSignedIn({
  clearIntent,
  intent,
  signedIn,
}: {
  clearIntent: (intent: AuthenticationLinkIntent) => void;
  intent: AuthenticationLinkIntent | null;
  signedIn: boolean;
}): void {
  useEffect(() => {
    if (signedIn && intent !== null && signInLinks.has(intent.type)) clearIntent(intent);
  }, [clearIntent, intent, signedIn]);
}
