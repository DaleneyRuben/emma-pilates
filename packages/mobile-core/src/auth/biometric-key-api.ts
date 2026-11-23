import {
  exchangeBiometricKey,
  issueBiometricKey,
  revokeBiometricKey,
} from "@pilates/api-contracts";

import { createApiFetcher } from "../api/fetcher";
import type { BiometricKey } from "./credential-store";

type BiometricKeyApiOptions = {
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
};

export type BiometricKeyExchangeResult =
  | { credential: string; deviceKey: string; status: "created" }
  | { status: "rejected" }
  | { retryAfterSeconds: number; status: "throttled" };

export type BiometricKeyApi = {
  exchange: (input: {
    clientIdentifier: string;
    deviceKey: string;
    unlockSecret: string;
  }) => Promise<BiometricKeyExchangeResult>;
  issue: (input: { clientIdentifier: string; credential: string }) => Promise<BiometricKey>;
  revoke: (input: { clientIdentifier: string; deviceKey: string }) => Promise<void>;
};

/** ADR-0112's three endpoints; a status the app cannot act on rejects. */
export function createBiometricKeyApi({ baseUrl, fetch }: BiometricKeyApiOptions): BiometricKeyApi {
  const fetcher = (credential: string | null) =>
    createApiFetcher({ baseUrl, fetch, getCredential: async () => credential });
  const installation = (clientIdentifier: string) => ({
    headers: { "x-client-identifier": clientIdentifier },
  });

  return {
    async exchange({ clientIdentifier, deviceKey, unlockSecret }) {
      const response = await exchangeBiometricKey(
        { deviceKey, unlockSecret },
        installation(clientIdentifier),
        fetcher(null),
      );
      const status: number = response.status;

      if (status === 401) {
        return { status: "rejected" };
      }

      if (status === 429) {
        const retryAfterSeconds = Number(response.headers.get("Retry-After") ?? "0");

        return {
          retryAfterSeconds: Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : 0,
          status: "throttled",
        };
      }

      if (status !== 201) {
        throw new Error(`Biometric key exchange failed with ${status}`);
      }

      return { ...response.data, status: "created" };
    },
    async issue({ clientIdentifier, credential }) {
      const response = await issueBiometricKey(installation(clientIdentifier), fetcher(credential));
      const status: number = response.status;

      if (status !== 201) {
        throw new Error(`Biometric key issue failed with ${status}`);
      }

      return response.data;
    },
    async revoke({ clientIdentifier, deviceKey }) {
      const response = await revokeBiometricKey(
        { deviceKey },
        installation(clientIdentifier),
        fetcher(null),
      );
      const status: number = response.status;

      if (status !== 204) {
        throw new Error(`Biometric key revocation failed with ${status}`);
      }
    },
  };
}
