import { createContext, type PropsWithChildren, useContext, useEffect, useState } from "react";
import { Linking } from "react-native";

import { type LinkSource, subscribeToVerifiedLinks } from "./link-ingress";
import type { AuthenticationLinkIntent, LinkIdentityKind } from "./verified-link";

type VerifiedLinkState = {
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

  return <VerifiedLinkContext.Provider value={{ intent }}>{children}</VerifiedLinkContext.Provider>;
}

export function useVerifiedLinkIntent(): VerifiedLinkState {
  const state = useContext(VerifiedLinkContext);

  if (state === undefined) {
    throw new Error("useVerifiedLinkIntent requires VerifiedLinkProvider");
  }

  return state;
}
