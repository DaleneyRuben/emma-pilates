import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const biometricOptions = {
  authenticationPrompt: "Confirma tu identidad para iniciar sesión.",
  requireAuthentication: true,
};

type CredentialStorageOptions = {
  authenticationPrompt?: string;
  requireAuthentication?: boolean;
};

type CredentialStorage = {
  canUseBiometricAuthentication?: () => boolean;
  deleteItemAsync: (key: string) => Promise<void>;
  getItemAsync: (key: string, options?: CredentialStorageOptions) => Promise<string | null>;
  setItemAsync: (key: string, value: string, options?: CredentialStorageOptions) => Promise<void>;
};

type CredentialStoreOptions = {
  /** Android asks for the fingerprint while it encrypts the protected copy. */
  promptsOnSave?: boolean;
};

export type BiometricKey = { deviceKey: string; unlockSecret: string };

/**
 * The session credential, plus the biometric key of ADR-0112: the unlock
 * secret behind the fingerprint or Face ID, written once when biometrics are
 * turned on, and the device key outside it, replaced on every use.
 */
export function createCredentialStore(
  storage: CredentialStorage,
  namespace = "",
  { promptsOnSave = false }: CredentialStoreOptions = {},
) {
  const prefix = namespace === "" ? "" : `${namespace}.`;
  const credentialKey = `${prefix}authentication-session`;
  const unlockSecretKey = `${prefix}biometric-unlock-secret`;
  const deviceKeyKey = `${prefix}biometric-device-key`;
  // PR #372 kept the session itself behind the prompt.
  const legacyCredentialKey = `${prefix}authentication-session-biometric`;
  const legacyMarkerKey = `${prefix}authentication-session-biometric-enabled`;
  // Per device, so «Ahora no» outlives sign-out: `clear` never deletes it.
  const offerDeclinedKey = `${prefix}biometric-offer-declined`;
  function canUseBiometrics(): boolean {
    return storage.canUseBiometricAuthentication?.() ?? false;
  }
  const loadBiometricDeviceKey = () => storage.getItemAsync(deviceKeyKey);
  const hasBiometricKey = async () => (await loadBiometricDeviceKey()) !== null;
  const forgetLegacyBiometricSession = async () => {
    await Promise.all([
      storage.deleteItemAsync(legacyCredentialKey),
      storage.deleteItemAsync(legacyMarkerKey),
    ]);
  };

  return {
    canUseBiometrics,
    /** Signing out ends the session only; the biometric key stays. */
    clear: async () => {
      await storage.deleteItemAsync(credentialKey);
      await forgetLegacyBiometricSession();
    },
    /**
     * Reads the unlock secret back behind the prompt, so iOS asks for Face ID
     * when it is turned on; where saving already asked, the key suffices.
     * A cancelled prompt rejects.
     */
    async confirmBiometrics(): Promise<boolean> {
      if (promptsOnSave) {
        return hasBiometricKey();
      }

      return (await storage.getItemAsync(unlockSecretKey, biometricOptions)) !== null;
    },
    async declineBiometricOffer(): Promise<void> {
      await storage.setItemAsync(offerDeclinedKey, "true");
    },
    async forgetBiometricKey(): Promise<void> {
      await Promise.all([
        storage.deleteItemAsync(unlockSecretKey),
        storage.deleteItemAsync(deviceKeyKey),
      ]);
    },
    forgetLegacyBiometricSession,
    hasBiometricKey,
    hasLegacyBiometricSession: async () => (await storage.getItemAsync(legacyMarkerKey)) === "true",
    load: () => storage.getItemAsync(credentialKey),
    loadBiometricDeviceKey,
    /** Behind the prompt; a cancelled or failed prompt rejects. */
    loadLegacyBiometricSession: () => storage.getItemAsync(legacyCredentialKey, biometricOptions),
    /** Behind the prompt; a cancelled or failed prompt rejects and keeps the key. */
    readUnlockSecret: () => storage.getItemAsync(unlockSecretKey, biometricOptions),
    async replaceBiometricDeviceKey(deviceKey: string): Promise<void> {
      await storage.setItemAsync(deviceKeyKey, deviceKey);
    },
    async save(credential: string): Promise<void> {
      await storage.setItemAsync(credentialKey, credential);
      await forgetLegacyBiometricSession();
    },
    async saveBiometricKey({ deviceKey, unlockSecret }: BiometricKey): Promise<void> {
      if (!canUseBiometrics()) {
        throw new Error("Biometric authentication is unavailable");
      }

      await storage.setItemAsync(unlockSecretKey, unlockSecret, biometricOptions);
      await storage.setItemAsync(deviceKeyKey, deviceKey);
    },
    wasBiometricOfferDeclined: async () =>
      (await storage.getItemAsync(offerDeclinedKey)) === "true",
  };
}

export function createNativeCredentialStore(namespace: "client" | "staff") {
  return createCredentialStore(SecureStore, namespace, {
    promptsOnSave: Platform.OS === "android",
  });
}
