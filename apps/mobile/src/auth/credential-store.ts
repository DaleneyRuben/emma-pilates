import * as SecureStore from "expo-secure-store";

const credentialKey = "authentication-session";
const biometricCredentialKey = "authentication-session-biometric";
const biometricCredentialMarkerKey = "authentication-session-biometric-enabled";

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
  getItemAsync: (
    key: string,
    options?: CredentialStorageOptions,
  ) => Promise<string | null>;
  setItemAsync: (
    key: string,
    value: string,
    options?: CredentialStorageOptions,
  ) => Promise<void>;
};

export function createCredentialStore(storage: CredentialStorage) {
  function canUseBiometrics(): boolean {
    return storage.canUseBiometricAuthentication?.() ?? false;
  }

  return {
    canUseBiometrics,
    clear: async () => {
      await Promise.all([
        storage.deleteItemAsync(credentialKey),
        storage.deleteItemAsync(biometricCredentialKey),
        storage.deleteItemAsync(biometricCredentialMarkerKey),
      ]);
    },
    hasBiometricCredential: async () =>
      (await storage.getItemAsync(biometricCredentialMarkerKey)) === "true",
    load: () => storage.getItemAsync(credentialKey),
    loadWithBiometrics: () =>
      storage.getItemAsync(biometricCredentialKey, biometricOptions),
    async save(credential: string): Promise<void> {
      await storage.setItemAsync(credentialKey, credential);
      await Promise.all([
        storage.deleteItemAsync(biometricCredentialKey),
        storage.deleteItemAsync(biometricCredentialMarkerKey),
      ]);
    },
    async saveWithBiometrics(credential: string): Promise<void> {
      if (!canUseBiometrics()) {
        throw new Error("Biometric authentication is unavailable");
      }

      await storage.setItemAsync(
        biometricCredentialKey,
        credential,
        biometricOptions,
      );
      await storage.setItemAsync(biometricCredentialMarkerKey, "true");
      await storage.deleteItemAsync(credentialKey);
    },
  };
}

export const credentialStore = createCredentialStore(SecureStore);
