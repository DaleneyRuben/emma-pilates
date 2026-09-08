import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";

const persistableQueryNames = new Set([
  "sessions",
  "upcoming-bookings",
  "subscription-summary",
]);

export function getPersistedCacheKey(accountId: string): string {
  return `pilates-query:${accountId}`;
}

export function clearPersistedAccountCache(accountId: string): Promise<void> {
  return AsyncStorage.removeItem(getPersistedCacheKey(accountId));
}

export function shouldPersistQuery(queryKey: readonly unknown[]): boolean {
  return (
    typeof queryKey[0] === "string" && persistableQueryNames.has(queryKey[0])
  );
}

export function createMobilePersister(accountId: string) {
  return createAsyncStoragePersister({
    key: getPersistedCacheKey(accountId),
    storage: AsyncStorage,
  });
}
