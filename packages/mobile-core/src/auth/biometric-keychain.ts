import { reportRecoveredError } from "../monitoring/error-reporting";
import type { BiometricKeyApi } from "./biometric-key-api";
import type { BiometricKey } from "./credential-store";

export type BiometricKeychainStore = {
  canUseBiometrics?: () => boolean;
  confirmBiometrics?: () => Promise<boolean>;
  forgetBiometricKey?: () => Promise<void>;
  forgetLegacyBiometricSession?: () => Promise<void>;
  hasBiometricKey?: () => Promise<boolean>;
  hasLegacyBiometricSession?: () => Promise<boolean>;
  loadBiometricDeviceKey?: () => Promise<string | null>;
  loadLegacyBiometricSession?: () => Promise<string | null>;
  readUnlockSecret?: () => Promise<string | null>;
  replaceBiometricDeviceKey?: (deviceKey: string) => Promise<void>;
  saveBiometricKey?: (key: BiometricKey) => Promise<void>;
};

/** What the prompt and the server answered; «credential» still needs resolving. */
export type BiometricKeychainUnlock =
  | { credential: string; legacy: boolean; status: "credential" }
  | { status: "cancelled" }
  | { status: "failed" }
  | { status: "invalid" };

type BiometricKeychainOptions = {
  api?: BiometricKeyApi;
  installationIdentifier?: () => Promise<string>;
  store: BiometricKeychainStore;
};

/**
 * ADR-0112 on the phone: the key the server issued, the prompt that guards
 * its unlock secret, and the exchange that replaces it on every use.
 */
export function createBiometricKeychain({
  api,
  installationIdentifier,
  store,
}: BiometricKeychainOptions) {
  async function clientIdentifier(): Promise<string> {
    if (installationIdentifier === undefined) {
      throw new Error("Biometric keys need the installation identifier");
    }
    return installationIdentifier();
  }

  async function forget(): Promise<void> {
    await store.forgetBiometricKey?.();
  }

  // Best effort: a key the server keeps but the phone forgot can never be used.
  async function revokeOnServer(deviceKey: string): Promise<void> {
    try {
      await api?.revoke({ clientIdentifier: await clientIdentifier(), deviceKey });
    } catch (error) {
      reportRecoveredError(error);
    }
  }

  async function unlockLegacy(): Promise<BiometricKeychainUnlock> {
    let credential: string | null;
    try {
      credential = (await store.loadLegacyBiometricSession?.()) ?? null;
    } catch {
      return { status: "cancelled" };
    }

    if (credential === null) {
      await store.forgetLegacyBiometricSession?.();
      return { status: "invalid" };
    }

    return { credential, legacy: true, status: "credential" };
  }

  return {
    forget,
    forgetLegacy: async () => {
      await store.forgetLegacyBiometricSession?.();
    },
    async isEnabled(): Promise<boolean> {
      const [key, legacy] = await Promise.all([
        store.hasBiometricKey?.(),
        store.hasLegacyBiometricSession?.(),
      ]);
      return key === true || legacy === true;
    },
    /**
     * Asks the server for a key and keeps it; `confirm` reads it back behind
     * the prompt where saving did not ask. False leaves no key anywhere.
     */
    async protect(credential: string, { confirm }: { confirm: boolean }): Promise<boolean> {
      const { confirmBiometrics, saveBiometricKey } = store;
      if (api === undefined || saveBiometricKey === undefined) {
        return false;
      }

      let key: BiometricKey;
      try {
        key = await api.issue({ clientIdentifier: await clientIdentifier(), credential });
      } catch (error) {
        reportRecoveredError(error);
        return false;
      }

      try {
        await saveBiometricKey(key);
        if (!confirm || (await confirmBiometrics?.()) === true) {
          return true;
        }
      } catch {
        // A cancelled or failed prompt: the key is turned off below.
      }

      await revokeOnServer(key.deviceKey);
      await forget();
      return false;
    },
    /** Perfil's switch off, or «Usar otra cuenta». */
    async turnOff(): Promise<void> {
      const deviceKey = (await store.loadBiometricDeviceKey?.()) ?? null;
      if (deviceKey !== null) {
        await revokeOnServer(deviceKey);
      }
      await forget();
      await store.forgetLegacyBiometricSession?.();
    },
    async unlock(): Promise<BiometricKeychainUnlock> {
      if (!((await store.hasBiometricKey?.()) ?? false)) {
        return (await store.hasLegacyBiometricSession?.()) ? unlockLegacy() : { status: "invalid" };
      }

      let unlockSecret: string | null;
      try {
        unlockSecret = (await store.readUnlockSecret?.()) ?? null;
      } catch {
        return { status: "cancelled" };
      }

      const deviceKey = (await store.loadBiometricDeviceKey?.()) ?? null;
      if (unlockSecret === null || deviceKey === null || api === undefined) {
        await forget();
        return { status: "invalid" };
      }

      try {
        const result = await api.exchange({
          clientIdentifier: await clientIdentifier(),
          deviceKey,
          unlockSecret,
        });

        if (result.status === "rejected") {
          await forget();
          return { status: "invalid" };
        }
        if (result.status === "throttled") {
          return { status: "failed" };
        }

        // The key sent no longer works: keep its successor before anything else.
        await store.replaceBiometricDeviceKey?.(result.deviceKey);
        return { credential: result.credential, legacy: false, status: "credential" };
      } catch (error) {
        reportRecoveredError(error);
        return { status: "failed" };
      }
    },
  };
}
