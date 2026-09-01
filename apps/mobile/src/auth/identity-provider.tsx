import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import type { MobileSession, SessionManager } from "./session-manager";

type MobileIdentityState = {
  session: MobileSession | null;
  status: "restoring" | "signed-in" | "signed-out";
};

type MobileIdentity = MobileIdentityState & {
  logout: () => Promise<void>;
  start: (credential: string) => Promise<void>;
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
  const [identity, setIdentity] = useState<MobileIdentityState>({
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

  const start = useCallback(
    async (credential: string) => {
      const session = await manager.start(credential);

      setIdentity({
        session,
        status: session === null ? "signed-out" : "signed-in",
      });
    },
    [manager],
  );

  const logout = useCallback(async () => {
    if (identity.session === null) {
      return;
    }

    await manager.logout(identity.session);
    setIdentity({ session: null, status: "signed-out" });
  }, [identity.session, manager]);

  return (
    <MobileIdentityContext.Provider value={{ ...identity, logout, start }}>
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
