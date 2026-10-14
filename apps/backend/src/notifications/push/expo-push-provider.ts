import { z } from 'zod';
import {
  maxMessagesPerRequest,
  maxReceiptIdsPerRequest,
  PermanentPushError,
  TransientPushError,
  type PushMessage,
  type PushOutcome,
  type PushProvider,
  type PushTicket,
} from './push-provider';

const sendUrl = 'https://exp.host/--/api/v2/push/send';
const receiptsUrl = 'https://exp.host/--/api/v2/push/getReceipts';

const errorDetail = z.object({
  status: z.literal('error'),
  details: z.object({ error: z.string().optional() }).optional(),
});
const ticketSchema = z.union([
  z.object({ status: z.literal('ok'), id: z.string().min(1) }),
  errorDetail,
]);
const receiptSchema = z.union([
  z.object({ status: z.literal('ok') }),
  errorDetail,
]);
const sendResponseSchema = z.object({ data: z.array(ticketSchema) });
const receiptsResponseSchema = z.object({
  data: z.record(z.string(), receiptSchema),
});

// Expo's error codes, reduced to sanitized categories for logs and rows.
const categories: Record<string, string> = {
  DeviceNotRegistered: 'device_not_registered',
  InvalidCredentials: 'provider_credentials',
  MessageTooBig: 'message_too_big',
  MessageRateExceeded: 'rate_exceeded',
  MismatchSenderId: 'provider_credentials',
};

const toOutcome = (
  entry: z.infer<typeof errorDetail>,
): Exclude<PushOutcome, { status: 'ok' }> => {
  const code = entry.details?.error ?? '';
  return {
    status: 'error',
    category: Object.hasOwn(categories, code)
      ? categories[code]
      : 'provider_error',
    deviceNotRegistered: code === 'DeviceNotRegistered',
  };
};

const toExpoMessage = ({ sound, ...message }: PushMessage) =>
  sound === null ? message : { ...message, sound };

const retryAfter = (response: Response): number | null => {
  const seconds = Number(response.headers.get('retry-after'));
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
};

export const createExpoPushProvider = (options: {
  fetch: typeof fetch;
  accessToken: string | null;
}): PushProvider => {
  const post = async (url: string, body: unknown): Promise<unknown> => {
    let response: Response;
    try {
      response = await options.fetch(url, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          ...(options.accessToken === null
            ? {}
            : { authorization: `Bearer ${options.accessToken}` }),
        },
        body: JSON.stringify(body),
      });
    } catch {
      throw new TransientPushError('network');
    }

    if (response.status === 429) {
      throw new TransientPushError('rate_limited', retryAfter(response));
    }
    if (response.status >= 500) {
      throw new TransientPushError('provider_unavailable');
    }
    if (response.status === 401 || response.status === 403) {
      throw new PermanentPushError('provider_authentication');
    }
    if (!response.ok) {
      throw new PermanentPushError('provider_rejected_request');
    }

    try {
      return (await response.json()) as unknown;
    } catch {
      throw new TransientPushError('provider_unavailable');
    }
  };

  return {
    send: async (messages) => {
      if (messages.length > maxMessagesPerRequest) {
        throw new PermanentPushError('too_many_messages');
      }
      const parsed = sendResponseSchema.safeParse(
        await post(sendUrl, messages.map(toExpoMessage)),
      );
      if (!parsed.success || parsed.data.data.length !== messages.length) {
        throw new PermanentPushError('provider_response_invalid');
      }

      return parsed.data.data.map((ticket): PushTicket =>
        ticket.status === 'ok'
          ? { status: 'ok', id: ticket.id }
          : toOutcome(ticket),
      );
    },

    getReceipts: async (ticketIds) => {
      if (ticketIds.length > maxReceiptIdsPerRequest) {
        throw new PermanentPushError('too_many_receipt_ids');
      }
      const parsed = receiptsResponseSchema.safeParse(
        await post(receiptsUrl, { ids: ticketIds }),
      );
      if (!parsed.success) {
        throw new PermanentPushError('provider_response_invalid');
      }

      // A receipt Expo does not have yet is simply absent.
      return new Map(
        ticketIds.flatMap((id): [string, PushOutcome][] => {
          const receipt = parsed.data.data[id];
          if (receipt === undefined) return [];
          return [
            [
              id,
              receipt.status === 'ok' ? { status: 'ok' } : toOutcome(receipt),
            ],
          ];
        }),
      );
    },
  };
};
