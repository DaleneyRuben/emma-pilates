import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Linking } from "react-native";

import { type LinkSource, subscribeToVerifiedLinks } from "./link-ingress";
import type { AuthenticationLinkIntent, LinkIdentityKind } from "./verified-link";

type VerifiedLinkState = {
  /**
   * Forgets a link once its screen used it, so a later Login (after signing
   * out, say) does not open it again (walkthrough n.º 17). A newer link that
   * arrived meanwhile stays.
   */
  clearIntent: (intent: AuthenticationLinkIntent) => void;
  intent: AuthenticationLinkIntent | null;
};

const VerifiedLinkContext = createContext<VerifiedLinkState | undefined>(undefined);

type VerifiedLinkProviderProps = PropsWithChildren<{
  allowedHosts: readonly string[];
  identityKind: LinkIdentityKind;
  source?: LinkSource;
}>;

export function VerifiedLinkProvider({
  allowedHosts,
  children,
  identityKind,
  source = Linking,
}: VerifiedLinkProviderProps) {
  const [intent, setIntent] = useState<AuthenticationLinkIntent | null>(null);

  useEffect(
    () =>
      subscribeToVerifiedLinks({
        allowedHosts,
        identityKind,
        onIntent: setIntent,
        source,
      }),
    [allowedHosts, identityKind, source],
  );

  const clearIntent = useCallback((handled: AuthenticationLinkIntent) => {
    setIntent((current) => (current === handled ? null : current));
  }, []);
  const state = useMemo(() => ({ clearIntent, intent }), [clearIntent, intent]);

  return <VerifiedLinkContext.Provider value={state}>{children}</VerifiedLinkContext.Provider>;
}

export function useVerifiedLinkIntent(): VerifiedLinkState {
  const state = useContext(VerifiedLinkContext);

  if (state === undefined) {
    throw new Error("useVerifiedLinkIntent requires VerifiedLinkProvider");
  }

  return state;
}
