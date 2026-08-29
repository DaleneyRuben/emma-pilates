import * as SecureStore from "expo-secure-store";

const credentialKey = "authentication-session";

type CredentialStorage = {
  deleteItemAsync: (key: string) => Promise<void>;
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
};

export function createCredentialStore(storage: CredentialStorage) {
  return {
    clear: () => storage.deleteItemAsync(credentialKey),
    load: () => storage.getItemAsync(credentialKey),
    save: (credential: string) =>
      storage.setItemAsync(credentialKey, credential),
  };
}

export const credentialStore = createCredentialStore(SecureStore);
