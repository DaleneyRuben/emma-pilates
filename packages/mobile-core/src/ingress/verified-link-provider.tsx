import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import { Linking } from "react-native";

import {
  type LinkSource,
  subscribeToVerifiedLinks,
} from "./link-ingress";
import type { AuthenticationLinkIntent } from "./verified-link";

type VerifiedLinkState = {
  intent: AuthenticationLinkIntent | null;
};

const VerifiedLinkContext = createContext<VerifiedLinkState | undefined>(
  undefined,
);

type VerifiedLinkProviderProps = PropsWithChildren<{
  allowedHosts: readonly string[];
  source?: LinkSource;
}>;

export function VerifiedLinkProvider({
  allowedHosts,
  children,
  source = Linking,
}: VerifiedLinkProviderProps) {
  const [intent, setIntent] = useState<AuthenticationLinkIntent | null>(null);

  useEffect(
    () =>
      subscribeToVerifiedLinks({
        allowedHosts,
        onIntent: setIntent,
        source,
      }),
    [allowedHosts, source],
  );

  return (
    <VerifiedLinkContext.Provider value={{ intent }}>
      {children}
    </VerifiedLinkContext.Provider>
  );
}

export function useVerifiedLinkIntent(): VerifiedLinkState {
  const state = useContext(VerifiedLinkContext);

  if (state === undefined) {
    throw new Error("useVerifiedLinkIntent requires VerifiedLinkProvider");
  }

  return state;
}
