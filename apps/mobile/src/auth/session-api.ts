import { getCurrentAuthenticationSession } from "@pilates/api-contracts";

import { createApiFetcher } from "../api/fetcher";

type SessionApiOptions = {
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
};

export function createSessionApi(options: SessionApiOptions) {
  const { baseUrl, fetch } = options;

  return {
    async resolveCurrent(credential: string) {
      const apiFetcher = createApiFetcher({
        baseUrl,
        fetch,
        getCredential: async () => credential,
      });
      const response = await getCurrentAuthenticationSession(
        undefined,
        apiFetcher,
      );

      return response.data;
    },
  };
}
