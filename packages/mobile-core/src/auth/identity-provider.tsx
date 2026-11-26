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

export const biometricUnlockFailure = "No pudimos entrar. Revisa tu conexión e intenta de nuevo.";

export type MobileBiometrics = {
  /**
   * The launch opened locked and the prompt has not been shown yet: the
   * Login hero opens it by itself, once (not after signing out in the app).
   */
  autoPrompt: boolean;
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
  /** The scan worked but the server could not be reached. */
  unlockError: string | null;
  /** The password changed: the server already revoked this phone's key. */
  forgetAfterPasswordChange: () => Promise<void>;
  /** «Usar otra cuenta»: forgets biometrics on this phone and shows the form. */
  useAnotherAccount: () => Promise<void>;
};

type StartOptions = {
  /** A password sign-in, which may offer biometrics next. */
  offerBiometrics?: boolean;
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
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [biometricOffer, setBiometricOffer] = useState(false);
  const [enabledNotice, setEnabledNotice] = useState(false);
  const [autoPrompt, setAutoPrompt] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([manager.restore(), manager.hasBiometricSession()]).then(
      ([session, hasBiometricSession]) => {
        if (active) {
          setBiometricsEnabled(hasBiometricSession);
          setAutoPrompt(session === null && hasBiometricSession);
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
    try {
      const [enabled, declined] = await Promise.all([
        manager.isBiometricsEnabled(),
        manager.wasBiometricOfferDeclined(),
      ]);
      return !enabled && !declined;
    } catch (error) {
      // The sign-in itself succeeded; an unreadable keychain only skips the offer.
      reportRecoveredError(error);
      return false;
    }
  }, [manager]);

  const start = useCallback(
    async (credential: string, options: StartOptions = {}) => {
      const { offerBiometrics = false } = options;
      const session = await manager.start(credential);
      const offer = session !== null && offerBiometrics && (await shouldOfferBiometrics());

      setSignOutNotice(null);
      setUnlockError(null);
      setBiometricsEnabled(false);
      setBiometricOffer(offer);
      setIdentity({
        session,
        status: session === null ? "signed-out" : "signed-in",
      });
    },
    [manager, shouldOfferBiometrics],
  );

  const unlockWithBiometrics = useCallback(async () => {
    setAutoPrompt(false);
    setUnlockError(null);
    let result: Awaited<ReturnType<SessionManager["unlockWithBiometrics"]>>;
    try {
      result = await manager.unlockWithBiometrics();
    } catch (error) {
      reportRecoveredError(error);
      result = { status: "failed" };
    }

    if (result.status !== "signed-in") {
      if (result.status === "failed") setUnlockError(biometricUnlockFailure);
      if (result.status === "invalid") {
        setBiometricsEnabled(false);
        setIdentity({ session: null, status: "signed-out" });
      }
      return;
    }

    // A phone from before ADR-0112 that could not keep a key is offered again.
    const reoffer = result.keyLost === true && manager.canUseBiometrics();
    setBiometricsEnabled(result.keyLost !== true);
    setBiometricOffer(reoffer);
    setIdentity({ session: result.session, status: "signed-in" });
  }, [manager]);

  const logout = useCallback(async () => {
    if (identity.session === null) {
      return;
    }

    await manager.logout(identity.session);
    // The key stays: the next screen greets with «Hola de nuevo».
    const locked = await manager.hasBiometricSession().catch(() => false);
    setBiometricsEnabled(locked);
    setBiometricOffer(false);
    setIdentity({ session: null, status: locked ? "biometric-locked" : "signed-out" });
  }, [identity.session, manager]);

  const useAnotherAccount = useCallback(async () => {
    setAutoPrompt(false);
    setUnlockError(null);
    try {
      await manager.disableBiometrics();
    } catch (error) {
      // The form still shows: a key the phone keeps is refused on its next use.
      reportRecoveredError(error);
    }
    setBiometricsEnabled(false);
    setIdentity({ session: null, status: "signed-out" });
  }, [manager]);

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
    let enabled = false;
    try {
      enabled = await manager.enableBiometrics();
    } catch (error) {
      reportRecoveredError(error);
    }
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

  const forgetAfterPasswordChange = useCallback(async () => {
    try {
      await manager.forgetBiometricsLocally?.();
    } catch (error) {
      reportRecoveredError(error);
    }
    setBiometricsEnabled(false);
  }, [manager]);

  const biometrics: MobileBiometrics = {
    autoPrompt,
    forgetAfterPasswordChange,
    // Read on each render: the person can deny Face ID or remove every fingerprint.
    available: manager.canUseBiometrics(),
    disable: disableBiometrics,
    dismissEnabledNotice: () => setEnabledNotice(false),
    dismissOffer,
    enable: enableBiometrics,
    enabled: biometricsEnabled,
    enabledNotice,
    offer: biometricOffer,
    unlockError,
    useAnotherAccount,
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

/** For screens that also render outside the provider, such as in their own specs. */
export function useOptionalMobileIdentity(): MobileIdentity | undefined {
  return useContext(MobileIdentityContext);
}

/**
 * Testing session (#5, Staff): whether «¿Entrar con Face ID?» is up. iOS
 * presents one modal at a time, so another sheet waits for it. False outside
 * the identity provider.
 */
export function useBiometricOfferOpen(): boolean {
  return useContext(MobileIdentityContext)?.biometrics.offer ?? false;
}

export function useMobileIdentity(): MobileIdentity {
  const identity = useContext(MobileIdentityContext);

  if (identity === undefined) {
    throw new Error("useMobileIdentity requires MobileIdentityProvider");
  }

  return identity;
}
