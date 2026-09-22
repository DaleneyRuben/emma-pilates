import {
  cancelBooking,
  cancelClientInvitation,
  correctClientInvitationEmail,
  createBooking,
  inviteClient,
  joinSessionWaitlist,
  leaveWaitlist,
  recordAssistantCashPayment,
  rescheduleBooking,
  resendClientInvitation,
  type AssistantCashPaymentDto,
  type ClientInvitationDto,
  type ClientInvitationResultDto,
} from "@pilates/api-contracts";
import { randomUUID } from "expo-crypto";

// Failures keep the stable Problem Details code so screens can word them.
export class AssistantApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | null,
  ) {
    super(`The Assistant request failed with ${status}`);
  }
}

export type AssistantApi = {
  bookForClient: (sessionId: string, clientId: string) => Promise<{ id: string }>;
  cancelBooking: (bookingId: string) => Promise<void>;
  cancelInvitation: (clientId: string) => Promise<void>;
  correctInvitationEmail: (
    clientId: string,
    email: string,
  ) => Promise<ClientInvitationDto>;
  inviteClient: (input: {
    name: string;
    email: string;
    phone: string | null;
  }) => Promise<ClientInvitationResultDto>;
  leaveWaitlist: (waitlistEntryId: string) => Promise<void>;
  recordCashPayment: (
    clientId: string,
    planId: string,
    branchId: string,
  ) => Promise<AssistantCashPaymentDto>;
  rescheduleBooking: (
    bookingId: string,
    targetSessionId: string,
  ) => Promise<{ id: string }>;
  resendInvitation: (clientId: string) => Promise<ClientInvitationDto>;
  waitlistForClient: (
    sessionId: string,
    clientId: string,
  ) => Promise<{ id: string }>;
};

const jsonHeaders = { "Content-Type": "application/json" };
const idempotent = () => ({ ...jsonHeaders, "idempotency-key": randomUUID() });

function problemCode(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const code = (body as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function requireSuccess<Body>(response: { status: number; data: Body }): Body {
  if (response.status < 200 || response.status >= 300) {
    throw new AssistantApiError(response.status, problemCode(response.data));
  }
  return response.data;
}

export function createAssistantApi(
  fetcher: typeof globalThis.fetch,
): AssistantApi {
  return {
    async bookForClient(sessionId, clientId) {
      const response = await createBooking(
        sessionId,
        { clientId },
        { headers: idempotent() },
        fetcher,
      );
      return requireSuccess(response) as { id: string };
    },
    async cancelBooking(bookingId) {
      requireSuccess(await cancelBooking(bookingId, undefined, fetcher));
    },
    async cancelInvitation(clientId) {
      requireSuccess(await cancelClientInvitation(clientId, undefined, fetcher));
    },
    async correctInvitationEmail(clientId, email) {
      const response = await correctClientInvitationEmail(
        clientId,
        { email },
        { headers: jsonHeaders },
        fetcher,
      );
      return requireSuccess(response) as ClientInvitationDto;
    },
    async inviteClient(input) {
      const response = await inviteClient(input, { headers: jsonHeaders }, fetcher);
      return requireSuccess(response) as ClientInvitationResultDto;
    },
    async leaveWaitlist(waitlistEntryId) {
      requireSuccess(await leaveWaitlist(waitlistEntryId, undefined, fetcher));
    },
    async recordCashPayment(clientId, planId, branchId) {
      const response = await recordAssistantCashPayment(
        clientId,
        { planId, branchId },
        { headers: idempotent() },
        fetcher,
      );
      return requireSuccess(response) as AssistantCashPaymentDto;
    },
    async rescheduleBooking(bookingId, targetSessionId) {
      const response = await rescheduleBooking(
        bookingId,
        { body: JSON.stringify({ targetSessionId }), headers: jsonHeaders },
        fetcher,
      );
      return requireSuccess(response) as { id: string };
    },
    async resendInvitation(clientId) {
      const response = await resendClientInvitation(clientId, undefined, fetcher);
      return requireSuccess(response) as ClientInvitationDto;
    },
    async waitlistForClient(sessionId, clientId) {
      const response = await joinSessionWaitlist(
        sessionId,
        { clientId },
        { headers: idempotent() },
        fetcher,
      );
      return requireSuccess(response) as { id: string };
    },
  };
}
