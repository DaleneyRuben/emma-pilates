import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { reportRecoveredError } from "../monitoring/error-reporting";
import type { MobileSession, SessionManager } from "./session-manager";

type MobileIdentityState = {
  session: MobileSession | null;
  status: "biometric-locked" | "restoring" | "signed-in" | "signed-out";
};

type MobileIdentity = MobileIdentityState & {
  /** Signs out after the server closed the Account and revoked every session. */
  endClosedSession: (notice: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Resolves the current session again (FUT-001: an Impersonation started or ended). */
  refresh: () => Promise<void>;
  /** Shown once on the login screen after a closure; cleared by the next sign-in. */
  signOutNotice: string | null;
  start: (credential: string, options?: { protectWithBiometrics?: boolean }) => Promise<void>;
  unlockWithBiometrics: () => Promise<void>;
};

const MobileIdentityContext = createContext<MobileIdentity | undefined>(undefined);

type MobileIdentityProviderProps = PropsWithChildren<{
  manager: SessionManager;
}>;

export function MobileIdentityProvider({ children, manager }: MobileIdentityProviderProps) {
  const [identity, setIdentity] = useState<MobileIdentityState>({
    session: null,
    status: "restoring",
  });
  const [signOutNotice, setSignOutNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([manager.restore(), manager.hasBiometricSession()]).then(
      ([session, hasBiometricSession]) => {
        if (active) {
          setIdentity({
            session,
            status:
              session === null && hasBiometricSession
                ? "biometric-locked"
                : session === null
                  ? "signed-out"
                  : "signed-in",
          });
        }
      },
      // MOB-069: a keychain the build cannot read (an unsigned Simulator build
      // answered -34018) lands on Login instead of holding the launch screen.
      (error: unknown) => {
        reportRecoveredError(error);
        if (active) {
          setIdentity({ session: null, status: "signed-out" });
        }
      },
    );

    return () => {
      active = false;
    };
  }, [manager]);

  const start = useCallback(
    async (credential: string, options?: { protectWithBiometrics?: boolean }) => {
      const session =
        options === undefined
          ? await manager.start(credential)
          : await manager.start(credential, options);

      setSignOutNotice(null);
      setIdentity({
        session,
        status: session === null ? "signed-out" : "signed-in",
      });
    },
    [manager],
  );

  const unlockWithBiometrics = useCallback(async () => {
    const session = await manager.unlockWithBiometrics();

    setIdentity({
      session,
      status: session === null ? "signed-out" : "signed-in",
    });
  }, [manager]);

  const logout = useCallback(async () => {
    if (identity.session === null) {
      return;
    }

    await manager.logout(identity.session);
    setIdentity({ session: null, status: "signed-out" });
  }, [identity.session, manager]);

  const refresh = useCallback(async () => {
    const session = await manager.refresh();

    setIdentity({
      session,
      status: session === null ? "signed-out" : "signed-in",
    });
  }, [manager]);

  const endClosedSession = useCallback(
    async (notice: string) => {
      if (identity.session !== null) {
        await manager.endLocally(identity.session);
      }
      setSignOutNotice(notice);
      setIdentity({ session: null, status: "signed-out" });
    },
    [identity.session, manager],
  );

  return (
    <MobileIdentityContext.Provider
      value={{
        ...identity,
        endClosedSession,
        logout,
        refresh,
        signOutNotice,
        start,
        unlockWithBiometrics,
      }}
    >
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
