import {
  getCurrentAuthenticationSession,
  logoutCurrentAuthenticationSession,
  type CurrentAuthenticationPrincipalDto,
} from "@pilates/api-contracts";

import { createApiFetcher } from "../api/fetcher";

type SessionApiOptions = {
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
};

export function createSessionApi(options: SessionApiOptions) {
  const { baseUrl, fetch } = options;

  function getAuthenticatedFetcher(credential: string) {
    return createApiFetcher({
      baseUrl,
      fetch,
      getCredential: async () => credential,
    });
  }

  return {
    async resolveCurrent(
      credential: string,
    ): Promise<CurrentAuthenticationPrincipalDto | null> {
      const response = await getCurrentAuthenticationSession(
        undefined,
        getAuthenticatedFetcher(credential),
      );
      const status: number = response.status;

      if (status === 401) {
        return null;
      }

      if (status !== 200) {
        throw new Error(`Current Authentication Session failed with ${status}`);
      }

      return response.data;
    },
    async revokeCurrent(credential: string): Promise<void> {
      const response = await logoutCurrentAuthenticationSession(
        undefined,
        getAuthenticatedFetcher(credential),
      );
      const status: number = response.status;

      if (status !== 204) {
        throw new Error(`Authentication Session logout failed with ${status}`);
      }
    },
  };
}
