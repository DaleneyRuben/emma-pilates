import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";

// ADR-0035: only Session schedules, upcoming Bookings, the Subscription
// summary, and the signed-in Client's own profile may survive offline.
// Keys are the generated request paths, matched exactly, so a sibling such
// as the photo bytes or another Client's record stays out.
const persistableQueryPaths = new Set([
  "/api/v1/sessions",
  "/api/v1/trainer/sessions",
  "/api/v1/bookings",
  "/api/v1/clients/current/subscription",
  "/api/v1/clients/current",
]);

export const persistedCacheVersion = "1";

export const persistedCacheMaxAgeMilliseconds = 24 * 60 * 60 * 1_000;

export function getPersistedCacheKey(accountId: string): string {
  return `pilates-query:${accountId}`;
}

export function clearPersistedAccountCache(accountId: string): Promise<void> {
  return AsyncStorage.removeItem(getPersistedCacheKey(accountId));
}

export function shouldPersistQuery(queryKey: readonly unknown[]): boolean {
  return typeof queryKey[0] === "string" && persistableQueryPaths.has(queryKey[0]);
}

export function createMobilePersister(accountId: string) {
  return createAsyncStoragePersister({
    key: getPersistedCacheKey(accountId),
    storage: AsyncStorage,
  });
}
