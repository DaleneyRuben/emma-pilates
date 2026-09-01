import type { CurrentAuthenticationPrincipalDto } from "@pilates/api-contracts";

export type AppRole =
  | "client"
  | "trainer"
  | "assistant"
  | "administrator"
  | "nutritionist";

export type MobileSession = {
  accountId: string;
  role: AppRole;
};

type CredentialStore = {
  canUseBiometrics?: () => boolean;
  clear: () => Promise<void>;
  hasBiometricCredential?: () => Promise<boolean>;
  load: () => Promise<string | null>;
  loadWithBiometrics?: () => Promise<string | null>;
  save: (credential: string) => Promise<void>;
  saveWithBiometrics?: (credential: string) => Promise<void>;
};

type SessionManagerOptions = {
  clearAccountCache: (accountId: string) => Promise<void>;
  credentialStore: CredentialStore;
  resolveCurrent: (
    credential: string,
  ) => Promise<CurrentAuthenticationPrincipalDto | null>;
  revokeCurrent: (credential: string) => Promise<void>;
};

export type SessionManager = {
  hasBiometricSession: () => Promise<boolean>;
  logout: (session: MobileSession) => Promise<void>;
  restore: () => Promise<MobileSession | null>;
  start: (
    credential: string,
    options?: { protectWithBiometrics?: boolean },
  ) => Promise<MobileSession | null>;
  unlockWithBiometrics: () => Promise<MobileSession | null>;
};

function toMobileSession(
  principal: CurrentAuthenticationPrincipalDto,
): MobileSession {
  return {
    accountId: principal.accountId,
    role:
      principal.identity.kind === "client"
        ? "client"
        : principal.identity.role,
  };
}

export function createSessionManager(
  options: SessionManagerOptions,
): SessionManager {
  const {
    clearAccountCache,
    credentialStore,
    resolveCurrent,
    revokeCurrent,
  } = options;
  let activeCredential: string | null = null;

  async function resolveCredential(
    credential: string,
  ): Promise<MobileSession | null> {
    const principal = await resolveCurrent(credential);

    if (principal === null) {
      activeCredential = null;
      await credentialStore.clear();
      return null;
    }

    activeCredential = credential;
    return toMobileSession(principal);
  }

  return {
    async hasBiometricSession(): Promise<boolean> {
      return (await credentialStore.hasBiometricCredential?.()) ?? false;
    },
    async restore(): Promise<MobileSession | null> {
      const credential = await credentialStore.load();

      if (credential === null) {
        return null;
      }

      return resolveCredential(credential);
    },
    async start(
      credential: string,
      options = {},
    ): Promise<MobileSession | null> {
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
      const credential =
        (await credentialStore.loadWithBiometrics?.()) ?? null;

      if (credential === null) {
        return null;
      }

      return resolveCredential(credential);
    },
    async logout(session: MobileSession): Promise<void> {
      const credential =
        activeCredential ?? (await credentialStore.load());

      if (credential !== null) {
        await revokeCurrent(credential);
      }

      activeCredential = null;
      await credentialStore.clear();
      await clearAccountCache(session.accountId);
    },
  };
}
