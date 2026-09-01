import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";

import type { MobileSession, SessionManager } from "./session-manager";

type MobileIdentity = {
  session: MobileSession | null;
  status: "restoring" | "signed-in" | "signed-out";
};

const MobileIdentityContext = createContext<MobileIdentity | undefined>(
  undefined,
);

type MobileIdentityProviderProps = PropsWithChildren<{
  manager: SessionManager;
}>;

export function MobileIdentityProvider({
  children,
  manager,
}: MobileIdentityProviderProps) {
  const [identity, setIdentity] = useState<MobileIdentity>({
    session: null,
    status: "restoring",
  });

  useEffect(() => {
    let active = true;

    void manager.restore().then((session) => {
      if (active) {
        setIdentity({
          session,
          status: session === null ? "signed-out" : "signed-in",
        });
      }
    });

    return () => {
      active = false;
    };
  }, [manager]);

  return (
    <MobileIdentityContext.Provider value={identity}>
      {children}
    </MobileIdentityContext.Provider>
  );
}

export function useMobileIdentity(): MobileIdentity {
  const identity = useContext(MobileIdentityContext);

  if (identity === undefined) {
    throw new Error("useMobileIdentity requires MobileIdentityProvider");
  }

  return identity;
}
