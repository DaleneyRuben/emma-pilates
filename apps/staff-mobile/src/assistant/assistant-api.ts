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
} from "@pilates/api-contracts";
import { randomUUID } from "expo-crypto";

import { photographTransferReceipt } from "./front-desk-receipt-upload";

// Failures keep the stable Problem Details code so screens can word them.
export class AssistantApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | null,
    /** The server wait of a limited email (Retry-After), 0 when none. */
    readonly retryAfterSeconds = 0,
    readonly detail: string | null = null,
  ) {
    super(`The Assistant request failed with ${status}`);
  }
}

export type AssistantApi = {
  bookForClient: (sessionId: string, clientId: string) => Promise<{ id: string }>;
  cancelBooking: (bookingId: string) => Promise<void>;
  cancelInvitation: (clientId: string) => Promise<void>;
  correctInvitationEmail: (clientId: string, email: string) => Promise<ClientInvitationDto>;
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
    startsOn?: string,
  ) => Promise<AssistantCashPaymentDto>;
  photographTransferReceipt: () => Promise<{ imageAssetId: string } | null>;
  recordFrontDeskTransfer: (
    clientId: string,
    planId: string,
    branchId: string,
    imageAssetId: string,
    startsOn?: string,
  ) => Promise<{ id: string; state: string }>;
  rescheduleBooking: (bookingId: string, targetSessionId: string) => Promise<{ id: string }>;
  resendInvitation: (clientId: string) => Promise<ClientInvitationDto>;
  sendVerification: (clientId: string) => Promise<void>;
  waitlistForClient: (sessionId: string, clientId: string) => Promise<{ id: string }>;
};

const jsonHeaders = { "Content-Type": "application/json" };
const idempotent = () => ({ ...jsonHeaders, "idempotency-key": randomUUID() });

function problemField(body: unknown, field: "code" | "detail"): string | null {
  if (typeof body !== "object" || body === null) return null;
  const value = (body as { code?: unknown; detail?: unknown })[field];
  return typeof value === "string" ? value : null;
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
      problemField(response.data, "code"),
      retryAfter(response.headers),
      problemField(response.data, "detail"),
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
    photographTransferReceipt() {
      return photographTransferReceipt(fetcher);
    },
    async recordFrontDeskTransfer(clientId, planId, branchId, imageAssetId, startsOn) {
      const response = await fetcher(`/api/v1/assistant/clients/${clientId}/transfer-payments`, {
        method: "POST",
        headers: idempotent(),
        body: JSON.stringify({
          planId,
          branchId,
          imageAssetId,
          ...(startsOn === undefined ? {} : { startsOn }),
        }),
      });
      return requireSuccess({
        status: response.status,
        data: await response.json().catch(() => null),
        headers: response.headers,
      }) as { id: string; state: string };
    },
    async recordCashPayment(clientId, planId, branchId, startsOn) {
      const response = await recordAssistantCashPayment(
        clientId,
        { planId, branchId, ...(startsOn === undefined ? {} : { startsOn }) },
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
