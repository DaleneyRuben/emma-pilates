import * as SecureStore from "expo-secure-store";

import type { PendingRegistration } from "./pending-registration-screens";

type SecureStorage = {
  deleteItemAsync: (key: string) => Promise<void>;
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
};

export type PendingRegistrationStore = {
  clear: () => Promise<void>;
  load: () => Promise<PendingRegistration | null>;
  save: (pending: PendingRegistration) => Promise<void>;
};

function parse(value: string): PendingRegistration | null {
  try {
    const stored = JSON.parse(value) as Record<string, unknown>;
    return typeof stored.email === "string" &&
      typeof stored.pendingExpiresAt === "number" &&
      typeof stored.registrationContinuation === "string"
      ? {
          email: stored.email,
          pendingExpiresAt: stored.pendingExpiresAt,
          registrationContinuation: stored.registrationContinuation,
        }
      : null;
  } catch {
    return null;
  }
}

/**
 * MOB-028: the pending registration (its continuation secret, email, and the
 * device's 7-day window) outlives an app restart. Storage failures only cost
 * that convenience, so they never fail the launch or the registration.
 */
export function createPendingRegistrationStore(
  storage: SecureStorage,
  namespace: string,
): PendingRegistrationStore {
  const key = `${namespace}.pending-registration`;
  const clear = async () => {
    try {
      await storage.deleteItemAsync(key);
    } catch {
      // Nothing more to do: the next load drops what it cannot use.
    }
  };

  return {
    clear,
    async load() {
      let value: string | null;
      try {
        value = await storage.getItemAsync(key);
      } catch {
        return null;
      }
      if (value === null) return null;
      const pending = parse(value);
      if (pending === null) await clear();
      return pending;
    },
    async save(pending) {
      try {
        await storage.setItemAsync(key, JSON.stringify(pending));
      } catch {
        // The registration still works in memory for this launch.
      }
    },
  };
}

export function createNativePendingRegistrationStore(namespace: "client") {
  return createPendingRegistrationStore(SecureStore, namespace);
}
