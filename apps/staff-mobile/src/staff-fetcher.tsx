import { createContext, useContext } from "react";

const unavailableFetcher: typeof globalThis.fetch = async () => {
  throw new Error("The authenticated API fetcher is unavailable");
};

export const StaffFetcherContext =
  createContext<typeof globalThis.fetch>(unavailableFetcher);

export function useStaffFetcher(): typeof globalThis.fetch {
  return useContext(StaffFetcherContext);
}

export { unavailableFetcher };
