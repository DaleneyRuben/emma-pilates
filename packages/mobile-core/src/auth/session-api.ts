import {
  createMobileAuthenticationSession,
  getCurrentAuthenticationSession,
  logoutCurrentAuthenticationSession,
  type CurrentAuthenticationPrincipalDto,
} from "@pilates/api-contracts";

import { createApiFetcher } from "../api/fetcher";

type SessionApiOptions = {
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
};

export type SessionLoginResult =
  | { credential: string; status: "created" }
  | { status: "rejected" }
  | { retryAfterSeconds: number; status: "throttled" };

export function createSessionApi(options: SessionApiOptions) {
  const { baseUrl, fetch } = options;

  function getAuthenticatedFetcher(credential: string) {
    return createApiFetcher({
      baseUrl,
      fetch,
      getCredential: async () => credential,
    });
  }

  const unauthenticatedFetcher = createApiFetcher({
    baseUrl,
    fetch,
    getCredential: async () => null,
  });

  return {
    async login({
      clientIdentifier,
      email,
      password,
    }: {
      clientIdentifier: string;
      email: string;
      password: string;
    }): Promise<SessionLoginResult> {
      const response = await createMobileAuthenticationSession(
        { email, password },
        {
          headers: {
            "x-client-identifier": clientIdentifier,
          },
        },
        unauthenticatedFetcher,
      );
      const status: number = response.status;

      if (status === 401) {
        return { status: "rejected" };
      }

      if (status === 429) {
        const retryAfterSeconds = Number(response.headers.get("Retry-After") ?? "0");

        return {
          retryAfterSeconds: Number.isFinite(retryAfterSeconds)
            ? Math.max(0, Math.floor(retryAfterSeconds))
            : 0,
          status: "throttled",
        };
      }

      if (status !== 201) {
        throw new Error(`Authentication Session creation failed with ${status}`);
      }

      return { credential: response.data.credential, status: "created" };
    },
    async resolveCurrent(credential: string): Promise<CurrentAuthenticationPrincipalDto | null> {
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
