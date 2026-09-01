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
  clear: () => Promise<void>;
  load: () => Promise<string | null>;
  save: (credential: string) => Promise<void>;
};

type SessionManagerOptions = {
  clearAccountCache: (accountId: string) => Promise<void>;
  credentialStore: CredentialStore;
  resolveCurrent: (
    credential: string,
  ) => Promise<CurrentAuthenticationPrincipalDto>;
  revokeCurrent: (credential: string) => Promise<void>;
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

export function createSessionManager(options: SessionManagerOptions) {
  const { credentialStore, resolveCurrent } = options;

  return {
    async restore(): Promise<MobileSession | null> {
      const credential = await credentialStore.load();

      if (credential === null) {
        return null;
      }

      return toMobileSession(await resolveCurrent(credential));
    },
  };
}
