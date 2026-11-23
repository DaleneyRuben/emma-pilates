import type { CurrentAuthenticationPrincipalDto } from "@pilates/api-contracts";

import { reportRecoveredError } from "../monitoring/error-reporting";
import type { BiometricKeyApi } from "./biometric-key-api";
import { type BiometricKeychainStore, createBiometricKeychain } from "./biometric-keychain";

export type AppRole =
  "client" | "trainer" | "assistant" | "administrator" | "nutritionist" | "coordinator";

/** FUT-001: the Administrator is seeing the Staff app as this Staff Member. */
export type MobileImpersonation = NonNullable<CurrentAuthenticationPrincipalDto["impersonation"]>;

export type MobileSession = {
  accountId: string;
  role: AppRole;
  impersonation?: MobileImpersonation;
};

type CredentialStore = BiometricKeychainStore & {
  clear: () => Promise<void>;
  declineBiometricOffer?: () => Promise<void>;
  load: () => Promise<string | null>;
  save: (credential: string) => Promise<void>;
  wasBiometricOfferDeclined?: () => Promise<boolean>;
};

type SessionManagerOptions = {
  acceptedIdentityKind?: "client" | "staff";
  /** ADR-0112's endpoints; absent where biometrics are never offered. */
  biometricKeys?: BiometricKeyApi;
  clearAccountCache: (accountId: string) => Promise<void>;
  credentialStore: CredentialStore;
  installationIdentifier?: () => Promise<string>;
  resolveCurrent: (credential: string) => Promise<CurrentAuthenticationPrincipalDto | null>;
  revokeCurrent: (credential: string) => Promise<void>;
};

/**
 * «cancelled» stays on «Hola de nuevo»; «failed» says to try again; «invalid»
 * means the key is gone and the password form follows. `keyLost` marks a
 * phone from before ADR-0112 that signed in but could not keep a key.
 */
export type BiometricUnlockResult =
  | { keyLost?: true; session: MobileSession; status: "signed-in" }
  | { status: "cancelled" | "failed" | "invalid" };

export type SessionManager = {
  canUseBiometrics: () => boolean;
  declineBiometricOffer: () => Promise<void>;
  /** Turns the key off on the server, best effort, and forgets it here. */
  disableBiometrics: () => Promise<void>;
  /** Asks the server for a key and keeps it behind the prompt. */
  enableBiometrics: () => Promise<boolean>;
  /** The credential API requests carry: the active one, else the stored plain copy. */
  getCredential: () => Promise<string | null>;
  isBiometricsEnabled: () => Promise<boolean>;
  wasBiometricOfferDeclined: () => Promise<boolean>;
  /** Forgets a session the server already revoked, such as a closed Account's. */
  endLocally: (session: MobileSession) => Promise<void>;
  /** Resolves the current session again, such as after an Impersonation starts or ends. */
  refresh: () => Promise<MobileSession | null>;
  hasBiometricSession: () => Promise<boolean>;
  /** The server already revoked the key, such as after a password change. */
  forgetBiometricsLocally?: () => Promise<void>;
  /** Ends the session; the biometric key stays for the next launch. */
  logout: (session: MobileSession) => Promise<void>;
  restore: () => Promise<MobileSession | null>;
  start: (credential: string) => Promise<MobileSession | null>;
  unlockWithBiometrics: () => Promise<BiometricUnlockResult>;
};

function toMobileSession(principal: CurrentAuthenticationPrincipalDto): MobileSession {
  return {
    accountId: principal.accountId,
    role: principal.identity.kind === "client" ? "client" : principal.identity.role,
    ...(principal.impersonation === undefined ? {} : { impersonation: principal.impersonation }),
  };
}

export function createSessionManager(options: SessionManagerOptions): SessionManager {
  const {
    acceptedIdentityKind,
    biometricKeys,
    clearAccountCache,
    credentialStore,
    installationIdentifier,
    resolveCurrent,
    revokeCurrent,
  } = options;
  const keychain = createBiometricKeychain({
    api: biometricKeys,
    installationIdentifier,
    store: credentialStore,
  });
  let activeCredential: string | null = null;

  async function resolveCredential(credential: string): Promise<MobileSession | null> {
    const principal = await resolveCurrent(credential);

    if (principal === null) {
      activeCredential = null;
      await credentialStore.clear();
      return null;
    }

    if (acceptedIdentityKind !== undefined && principal.identity.kind !== acceptedIdentityKind) {
      activeCredential = null;
      await revokeCurrent(credential);
      await credentialStore.clear();
      return null;
    }

    activeCredential = credential;
    return toMobileSession(principal);
  }

  // Best effort: the server ends an idle session on its own anyway.
  async function endQuietly(credential: string): Promise<void> {
    try {
      await revokeCurrent(credential);
    } catch (error) {
      reportRecoveredError(error);
    }
  }

  async function unlockWithBiometrics(): Promise<BiometricUnlockResult> {
    const unlocked = await keychain.unlock();
    if (unlocked.status !== "credential") {
      return unlocked;
    }

    let session: MobileSession | null;
    try {
      session = await resolveCredential(unlocked.credential);
    } catch {
      return { status: "failed" };
    }

    if (session === null) {
      await (unlocked.legacy ? keychain.forgetLegacy() : keychain.forget());
      return { status: "invalid" };
    }

    const previous = await credentialStore.load();
    await credentialStore.save(unlocked.credential);
    if (previous !== null && previous !== unlocked.credential) {
      await endQuietly(previous);
    }
    if (!unlocked.legacy) {
      return { session, status: "signed-in" };
    }

    // A phone from before ADR-0112 moves to a key; the person just passed the prompt.
    await keychain.forgetLegacy();
    return (await keychain.protect(unlocked.credential, { confirm: false }))
      ? { session, status: "signed-in" }
      : { keyLost: true, session, status: "signed-in" };
  }

  return {
    canUseBiometrics: () => credentialStore.canUseBiometrics?.() ?? false,
    async declineBiometricOffer(): Promise<void> {
      await credentialStore.declineBiometricOffer?.();
    },
    async disableBiometrics(): Promise<void> {
      await keychain.turnOff();
      // «Usar otra cuenta» on the lock: the session saved behind it ends too.
      if (activeCredential === null) {
        const saved = await credentialStore.load();
        if (saved !== null) await endQuietly(saved);
        await credentialStore.clear();
      }
    },
    async enableBiometrics(): Promise<boolean> {
      return activeCredential === null
        ? false
        : keychain.protect(activeCredential, { confirm: true });
    },
    getCredential: async () => activeCredential ?? credentialStore.load(),
    hasBiometricSession: () => keychain.isEnabled(),
    isBiometricsEnabled: () => keychain.isEnabled(),
    wasBiometricOfferDeclined: async () =>
      (await credentialStore.wasBiometricOfferDeclined?.()) ?? false,
    async restore(): Promise<MobileSession | null> {
      // Owner, 2026-11-23: with a key on the phone every launch asks first.
      if ((await credentialStore.hasBiometricKey?.()) === true) {
        return null;
      }

      const credential = await credentialStore.load();

      if (credential === null) {
        return null;
      }

      return resolveCredential(credential);
    },
    // A password or recovery sign-in follows «Usar otra cuenta», a key the
    // server refused, or a recovery that revoked it: nothing to keep here.
    async start(credential: string): Promise<MobileSession | null> {
      await keychain.forget();
      await credentialStore.save(credential);

      return resolveCredential(credential);
    },
    unlockWithBiometrics,
    async logout(session: MobileSession): Promise<void> {
      const credential = activeCredential ?? (await credentialStore.load());

      if (credential !== null) {
        await revokeCurrent(credential);
      }

      activeCredential = null;
      await credentialStore.clear();
      await clearAccountCache(session.accountId);
    },
    async refresh(): Promise<MobileSession | null> {
      const credential = activeCredential ?? (await credentialStore.load());

      if (credential === null) {
        return null;
      }

      return resolveCredential(credential);
    },
    async endLocally(session: MobileSession): Promise<void> {
      activeCredential = null;
      await credentialStore.clear();
      await keychain.forget();
      await clearAccountCache(session.accountId);
    },
  };
}
