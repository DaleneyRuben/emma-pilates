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

export type MobileBiometrics = {
  /** The phone can protect the session with Face ID or a fingerprint. */
  available: boolean;
  enabled: boolean;
  /** Set once biometrics were turned on, for the confirming toast. */
  enabledNotice: boolean;
  /** Offered right after a password sign-in, until enabled or dismissed. */
  offer: boolean;
  disable: () => Promise<void>;
  dismissEnabledNotice: () => void;
  /** «Ahora no»: never offered again on this phone. */
  dismissOffer: () => Promise<void>;
  enable: () => Promise<boolean>;
};

type StartOptions = {
  /** A password sign-in, which may offer biometrics next. */
  offerBiometrics?: boolean;
  protectWithBiometrics?: boolean;
};

type MobileIdentity = MobileIdentityState & {
  biometrics: MobileBiometrics;
  /** Signs out after the server closed the Account and revoked every session. */
  endClosedSession: (notice: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Resolves the current session again (FUT-001: an Impersonation started or ended). */
  refresh: () => Promise<void>;
  /** Shown once on the login screen after a closure; cleared by the next sign-in. */
  signOutNotice: string | null;
  start: (credential: string, options?: StartOptions) => Promise<void>;
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
  const [biometricsAvailable] = useState(() => manager.canUseBiometrics());
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [biometricOffer, setBiometricOffer] = useState(false);
  const [enabledNotice, setEnabledNotice] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.all([manager.restore(), manager.hasBiometricSession()]).then(
      ([session, hasBiometricSession]) => {
        if (active) {
          setBiometricsEnabled(hasBiometricSession);
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

  const shouldOfferBiometrics = useCallback(async () => {
    if (!manager.canUseBiometrics()) return false;
    const [enabled, declined] = await Promise.all([
      manager.isBiometricsEnabled(),
      manager.wasBiometricOfferDeclined(),
    ]);
    return !enabled && !declined;
  }, [manager]);

  const start = useCallback(
    async (credential: string, options: StartOptions = {}) => {
      const { offerBiometrics = false, ...startOptions } = options;
      const session =
        startOptions.protectWithBiometrics === undefined
          ? await manager.start(credential)
          : await manager.start(credential, startOptions);
      const offer = session !== null && offerBiometrics && (await shouldOfferBiometrics());

      setSignOutNotice(null);
      setBiometricsEnabled(startOptions.protectWithBiometrics === true && session !== null);
      setBiometricOffer(offer);
      setIdentity({
        session,
        status: session === null ? "signed-out" : "signed-in",
      });
    },
    [manager, shouldOfferBiometrics],
  );

  const unlockWithBiometrics = useCallback(async () => {
    let session: MobileSession | null;
    try {
      session = await manager.unlockWithBiometrics();
    } catch {
      // A cancelled or failed prompt keeps the lock and the protected copy.
      return;
    }

    setBiometricsEnabled(session !== null);
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
    setBiometricsEnabled(false);
    setBiometricOffer(false);
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
      setBiometricsEnabled(false);
      setBiometricOffer(false);
      setSignOutNotice(notice);
      setIdentity({ session: null, status: "signed-out" });
    },
    [identity.session, manager],
  );

  const enableBiometrics = useCallback(async () => {
    const enabled = await manager.enableBiometrics();
    setBiometricOffer(false);
    setBiometricsEnabled(enabled);
    setEnabledNotice(enabled);
    return enabled;
  }, [manager]);

  const disableBiometrics = useCallback(async () => {
    await manager.disableBiometrics();
    setBiometricsEnabled(false);
    setEnabledNotice(false);
  }, [manager]);

  const dismissOffer = useCallback(async () => {
    setBiometricOffer(false);
    await manager.declineBiometricOffer();
  }, [manager]);

  const biometrics: MobileBiometrics = {
    available: biometricsAvailable,
    disable: disableBiometrics,
    dismissEnabledNotice: () => setEnabledNotice(false),
    dismissOffer,
    enable: enableBiometrics,
    enabled: biometricsEnabled,
    enabledNotice,
    offer: biometricOffer,
  };

  return (
    <MobileIdentityContext.Provider
      value={{
        ...identity,
        biometrics,
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
