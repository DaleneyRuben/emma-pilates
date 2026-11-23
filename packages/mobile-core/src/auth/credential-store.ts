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

export function createCredentialStore(
  storage: CredentialStorage,
  namespace = "",
  { promptsOnSave = false }: CredentialStoreOptions = {},
) {
  const prefix = namespace === "" ? "" : `${namespace}.`;
  const credentialKey = `${prefix}authentication-session`;
  const biometricCredentialKey = `${prefix}authentication-session-biometric`;
  const biometricCredentialMarkerKey = `${prefix}authentication-session-biometric-enabled`;
  // Per device, so «Ahora no» outlives sign-out: `clear` never deletes it.
  const offerDeclinedKey = `${prefix}biometric-offer-declined`;
  function canUseBiometrics(): boolean {
    return storage.canUseBiometricAuthentication?.() ?? false;
  }
  const hasBiometricCredential = async () =>
    (await storage.getItemAsync(biometricCredentialMarkerKey)) === "true";

  return {
    canUseBiometrics,
    clear: async () => {
      await Promise.all([
        storage.deleteItemAsync(credentialKey),
        storage.deleteItemAsync(biometricCredentialKey),
        storage.deleteItemAsync(biometricCredentialMarkerKey),
      ]);
    },
    /**
     * Reads the protected copy back behind the prompt, so iOS asks for Face ID
     * when it is turned on; where saving already asked, the marker suffices.
     * A cancelled prompt rejects.
     */
    async confirmBiometrics(): Promise<boolean> {
      if (promptsOnSave) {
        return hasBiometricCredential();
      }

      return (await storage.getItemAsync(biometricCredentialKey, biometricOptions)) !== null;
    },
    async declineBiometricOffer(): Promise<void> {
      await storage.setItemAsync(offerDeclinedKey, "true");
    },
    hasBiometricCredential,
    load: () => storage.getItemAsync(credentialKey),
    /**
     * A cancelled or failed prompt rejects and keeps the protected copy; only a
     * copy the phone no longer has (null) is forgotten.
     */
    async loadWithBiometrics(): Promise<string | null> {
      const credential = await storage.getItemAsync(biometricCredentialKey, biometricOptions);

      if (credential === null) {
        await Promise.all([
          storage.deleteItemAsync(biometricCredentialKey),
          storage.deleteItemAsync(biometricCredentialMarkerKey),
        ]);
      }

      return credential;
    },
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

      await storage.setItemAsync(biometricCredentialKey, credential, biometricOptions);
      await storage.setItemAsync(biometricCredentialMarkerKey, "true");
      await storage.deleteItemAsync(credentialKey);
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
