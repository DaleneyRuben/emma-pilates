import type { CurrentAuthenticationPrincipalDto } from "@pilates/api-contracts";

export type AppRole =
  "client" | "trainer" | "assistant" | "administrator" | "nutritionist" | "coordinator";

/** FUT-001: the Administrator is seeing the Staff app as this Staff Member. */
export type MobileImpersonation = NonNullable<CurrentAuthenticationPrincipalDto["impersonation"]>;

export type MobileSession = {
  accountId: string;
  role: AppRole;
  impersonation?: MobileImpersonation;
};

type CredentialStore = {
  canUseBiometrics?: () => boolean;
  clear: () => Promise<void>;
  confirmBiometrics?: () => Promise<boolean>;
  declineBiometricOffer?: () => Promise<void>;
  hasBiometricCredential?: () => Promise<boolean>;
  load: () => Promise<string | null>;
  loadWithBiometrics?: () => Promise<string | null>;
  save: (credential: string) => Promise<void>;
  saveWithBiometrics?: (credential: string) => Promise<void>;
  wasBiometricOfferDeclined?: () => Promise<boolean>;
};

type SessionManagerOptions = {
  acceptedIdentityKind?: "client" | "staff";
  clearAccountCache: (accountId: string) => Promise<void>;
  credentialStore: CredentialStore;
  resolveCurrent: (credential: string) => Promise<CurrentAuthenticationPrincipalDto | null>;
  revokeCurrent: (credential: string) => Promise<void>;
};

export type SessionManager = {
  canUseBiometrics: () => boolean;
  declineBiometricOffer: () => Promise<void>;
  /** Stores the plain copy again, which drops the protected one. */
  disableBiometrics: () => Promise<void>;
  /** Protects the active credential behind the prompt; false keeps the plain session. */
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
  logout: (session: MobileSession) => Promise<void>;
  restore: () => Promise<MobileSession | null>;
  start: (
    credential: string,
    options?: { protectWithBiometrics?: boolean },
  ) => Promise<MobileSession | null>;
  unlockWithBiometrics: () => Promise<MobileSession | null>;
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
    clearAccountCache,
    credentialStore,
    resolveCurrent,
    revokeCurrent,
  } = options;
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

  async function hasBiometricCredential(): Promise<boolean> {
    return (await credentialStore.hasBiometricCredential?.()) ?? false;
  }

  async function protect(credential: string): Promise<boolean> {
    const { confirmBiometrics, saveWithBiometrics } = credentialStore;

    if (saveWithBiometrics === undefined || confirmBiometrics === undefined) {
      return false;
    }

    try {
      await saveWithBiometrics(credential);
      if (await confirmBiometrics()) {
        return true;
      }
    } catch {
      // A cancelled or failed prompt: the plain copy is restored below.
    }

    await credentialStore.save(credential);
    return false;
  }

  return {
    canUseBiometrics: () => credentialStore.canUseBiometrics?.() ?? false,
    async declineBiometricOffer(): Promise<void> {
      await credentialStore.declineBiometricOffer?.();
    },
    async disableBiometrics(): Promise<void> {
      if (activeCredential !== null) {
        await credentialStore.save(activeCredential);
      }
    },
    async enableBiometrics(): Promise<boolean> {
      return activeCredential === null ? false : protect(activeCredential);
    },
    getCredential: async () => activeCredential ?? credentialStore.load(),
    hasBiometricSession: hasBiometricCredential,
    isBiometricsEnabled: hasBiometricCredential,
    wasBiometricOfferDeclined: async () =>
      (await credentialStore.wasBiometricOfferDeclined?.()) ?? false,
    async restore(): Promise<MobileSession | null> {
      const credential = await credentialStore.load();

      if (credential === null) {
        return null;
      }

      return resolveCredential(credential);
    },
    async start(credential: string, options = {}): Promise<MobileSession | null> {
      if (options.protectWithBiometrics) {
        if (credentialStore.saveWithBiometrics === undefined) {
          throw new Error("Biometric credential storage is unavailable");
        }

        await credentialStore.saveWithBiometrics(credential);
      } else {
        await credentialStore.save(credential);
      }

      return resolveCredential(credential);
    },
    async unlockWithBiometrics(): Promise<MobileSession | null> {
      const credential = (await credentialStore.loadWithBiometrics?.()) ?? null;

      if (credential === null) {
        return null;
      }

      return resolveCredential(credential);
    },
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
      await clearAccountCache(session.accountId);
    },
  };
}
