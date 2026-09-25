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
        throw new Error(`Account activation failed with ${response.status}`);
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
        throw new Error(
          `Registration cancellation failed with ${response.status}`,
        );
      }
    },
    async completeEmailChange(token: string) {
      const response = await completeEmailChangeRequest(
        { token },
        undefined,
        fetcher,
      );

      if (response.status !== 200) {
        throw new Error(`Email change completion failed with ${response.status}`);
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
        throw new Error(`Password recovery failed with ${response.status}`);
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
        throw new Error(`Email correction failed with ${response.status}`);
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
        throw new Error(`Link inspection failed with ${response.status}`);
      }

      return response.data;
    },
    async register(values: StartClientRegistrationDto) {
      const response = await registerClient(values, undefined, fetcher);

      if (response.status !== 202) {
        throw new Error(`Client registration failed with ${response.status}`);
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
        throw new Error(
          `Password recovery request failed with ${response.status}`,
        );
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
        throw new Error(`Verification resend failed with ${response.status}`);
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
        throw new Error(`Email verification failed with ${response.status}`);
      }

      return response.data;
    },
  };
}

export type AuthenticationApi = ReturnType<typeof createAuthenticationApi>;
