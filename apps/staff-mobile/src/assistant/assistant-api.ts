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
  sendClientVerification,
  type AssistantCashPaymentDto,
  type ClientInvitationDto,
  type ClientInvitationResultDto,
  type InviteClientDto,
  type InvoiceDataDto,
} from "@pilates/api-contracts";
import { randomUUID } from "expo-crypto";

// Failures keep the stable Problem Details code so screens can word them.
export class AssistantApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | null,
    /** The server wait of a limited email (Retry-After), 0 when none. */
    readonly retryAfterSeconds = 0,
  ) {
    super(`The Assistant request failed with ${status}`);
  }
}

export type AssistantApi = {
  bookForClient: (sessionId: string, clientId: string) => Promise<{ id: string }>;
  cancelBooking: (bookingId: string) => Promise<void>;
  cancelInvitation: (clientId: string) => Promise<void>;
  correctInvitationEmail: (clientId: string, email: string) => Promise<ClientInvitationDto>;
  inviteClient: (input: InviteClientDto) => Promise<ClientInvitationResultDto>;
  leaveWaitlist: (waitlistEntryId: string) => Promise<void>;
  recordCashPayment: (
    clientId: string,
    planId: string,
    branchId: string,
    invoiceData: InvoiceDataDto | null,
  ) => Promise<AssistantCashPaymentDto>;
  rescheduleBooking: (bookingId: string, targetSessionId: string) => Promise<{ id: string }>;
  resendInvitation: (clientId: string) => Promise<ClientInvitationDto>;
  sendVerification: (clientId: string) => Promise<void>;
  waitlistForClient: (sessionId: string, clientId: string) => Promise<{ id: string }>;
};

const jsonHeaders = { "Content-Type": "application/json" };
const idempotent = () => ({ ...jsonHeaders, "idempotency-key": randomUUID() });

function problemCode(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const code = (body as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function retryAfter(headers: Headers | undefined): number {
  const seconds = Number(headers?.get("Retry-After") ?? "0");
  return Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
}

// The body type is the caller's: a documented 429 carries no schema.
function requireSuccess(response: { status: number; data: unknown; headers?: Headers }): unknown {
  if (response.status < 200 || response.status >= 300) {
    throw new AssistantApiError(
      response.status,
      problemCode(response.data),
      retryAfter(response.headers),
    );
  }
  return response.data;
}

export function createAssistantApi(fetcher: typeof globalThis.fetch): AssistantApi {
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
    async recordCashPayment(clientId, planId, branchId, invoiceData) {
      const response = await recordAssistantCashPayment(
        clientId,
        { planId, branchId, invoiceData },
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
    async sendVerification(clientId) {
      requireSuccess(await sendClientVerification(clientId, undefined, fetcher));
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
