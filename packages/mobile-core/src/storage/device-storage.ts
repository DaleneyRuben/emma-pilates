import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * The phone's small key–value store, for an app that keeps a few device
 * facts (walkthrough n.º 13: the invite code a new install brought). The
 * native module is linked through this package.
 */
export const deviceStorage: {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
} = AsyncStorage;
