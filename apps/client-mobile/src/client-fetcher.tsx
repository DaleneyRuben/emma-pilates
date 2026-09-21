import { createContext, useContext } from "react";

const unavailableFetcher: typeof globalThis.fetch = async () => {
  throw new Error("The authenticated API fetcher is unavailable");
};

export const ClientFetcherContext =
  createContext<typeof globalThis.fetch>(unavailableFetcher);

export function useClientFetcher(): typeof globalThis.fetch {
  return useContext(ClientFetcherContext);
}
