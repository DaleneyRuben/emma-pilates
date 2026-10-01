import {
  activateAccount as activateAccountRequest,
  cancelPendingClientRegistration,
  completeEmailChange as completeEmailChangeRequest,
  completePasswordRecovery as completePasswordRecoveryRequest,
  correctPendingClientEmail,
  inspectAuthenticationLink,
  registerClient,
  requestPasswordRecovery as requestPasswordRecoveryRequest,
  resendPendingClientVerification,
  verifyClientEmail as verifyClientEmailRequest,
  type CompleteAccountActivationDto,
  type CompletePasswordRecoveryDto,
  type CorrectPendingClientEmailDto,
  type StartClientRegistrationDto,
} from "@pilates/api-contracts";

import { createApiFetcher } from "../api/fetcher";

// Failures keep the stable Problem Details code and any server wait
// (Retry-After), so screens word them without reading human text.
export class AuthenticationApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null,
    readonly retryAfterSeconds: number,
  ) {
    super(message);
  }
}

type ApiResponse = { data: unknown; headers: Headers; status: number };

function failure(label: string, response: ApiResponse): AuthenticationApiError {
  const body = response.data;
  const code =
    typeof body === "object" &&
    body !== null &&
    typeof (body as { code?: unknown }).code === "string"
      ? (body as { code: string }).code
      : null;
  const retryAfter = Number(response.headers.get("Retry-After") ?? "0");

  return new AuthenticationApiError(
    `${label} failed with ${response.status}`,
    response.status,
    code,
    Number.isFinite(retryAfter) ? Math.max(0, Math.floor(retryAfter)) : 0,
  );
}

type AuthenticationApiOptions = {
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
};

export function createAuthenticationApi({
  baseUrl,
  fetch,
}: AuthenticationApiOptions) {
  const fetcher = createApiFetcher({
    baseUrl,
    fetch,
    getCredential: async () => null,
  });

  return {
    async activateAccount(values: CompleteAccountActivationDto) {
      const response = await activateAccountRequest(
        values,
        undefined,
        fetcher,
      );

      if (response.status !== 200) {
        throw failure("Account activation", response);
      }

      return response.data;
    },
    async cancelRegistration(registrationContinuation: string) {
      const response = await cancelPendingClientRegistration(
        { registrationContinuation },
        undefined,
        fetcher,
      );

      if (response.status !== 204) {
        throw failure("Registration cancellation", response);
      }
    },
    async completeEmailChange(token: string) {
      const response = await completeEmailChangeRequest(
        { token },
        undefined,
        fetcher,
      );

      if (response.status !== 200) {
        throw failure("Email change completion", response);
      }

      return response.data;
    },
    async completePasswordRecovery(values: CompletePasswordRecoveryDto) {
      const response = await completePasswordRecoveryRequest(
        values,
        undefined,
        fetcher,
      );

      if (response.status !== 201) {
        throw failure("Password recovery", response);
      }

      return response.data;
    },
    async correctRegistrationEmail(values: CorrectPendingClientEmailDto) {
      const response = await correctPendingClientEmail(
        values,
        undefined,
        fetcher,
      );

      if (response.status !== 202) {
        throw failure("Email correction", response);
      }

      return response.data;
    },
    async inspectLink(token: string) {
      const response = await inspectAuthenticationLink(
        { token },
        undefined,
        fetcher,
      );

      if (response.status !== 200) {
        throw failure("Link inspection", response);
      }

      return response.data;
    },
    async register(values: StartClientRegistrationDto) {
      const response = await registerClient(values, undefined, fetcher);

      if (response.status !== 202) {
        throw failure("Client registration", response);
      }

      return response.data;
    },
    async requestPasswordRecovery(email: string) {
      const response = await requestPasswordRecoveryRequest(
        { email },
        undefined,
        fetcher,
      );

      if (response.status !== 202) {
        throw failure("Password recovery request", response);
      }

      return response.data;
    },
    async resendRegistrationVerification(
      registrationContinuation: string,
    ) {
      const response = await resendPendingClientVerification(
        { registrationContinuation },
        undefined,
        fetcher,
      );

      if (response.status !== 202) {
        throw failure("Verification resend", response);
      }

      return response.data;
    },
    async verifyClientEmail(verificationToken: string) {
      const response = await verifyClientEmailRequest(
        { verificationToken },
        undefined,
        fetcher,
      );

      if (response.status !== 200) {
        throw failure("Email verification", response);
      }

      return response.data;
    },
  };
}

export type AuthenticationApi = ReturnType<typeof createAuthenticationApi>;
