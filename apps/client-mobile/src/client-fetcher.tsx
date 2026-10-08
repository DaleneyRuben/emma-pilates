import { resolveApiUrl } from "@pilates/mobile-core";
import { createContext, useContext } from "react";

const unavailableFetcher: typeof globalThis.fetch = async () => {
  throw new Error("The authenticated API fetcher is unavailable");
};

export const ClientFetcherContext = createContext<typeof globalThis.fetch>(unavailableFetcher);

export function useClientFetcher(): typeof globalThis.fetch {
  return useContext(ClientFetcherContext);
}

export const ClientApiBaseUrlContext = createContext<string | undefined>(undefined);

// Public image URLs come back as API paths while the API stands in for the
// R2 origin (ADR-0077); a real origin's absolute URL passes through.
export function useResolvePublicUrl(): (url: string) => string {
  const baseUrl = useContext(ClientApiBaseUrlContext);
  return (url) => (baseUrl === undefined ? url : resolveApiUrl(baseUrl, url));
}
