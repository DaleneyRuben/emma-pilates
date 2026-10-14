// The project-owned push interface (ADR-0025); Expo stays in its adapter.
export type PushData = {
  notificationId: string;
  type: string;
  destinationType: string | null;
  destinationId: string | null;
};

export type PushMessage = {
  to: string;
  title: string;
  body: string;
  sound: 'default' | null;
  badge: number;
  channelId: 'actionable' | 'updates';
  priority: 'high' | 'normal';
  data: PushData;
};

export type PushOutcome =
  | { status: 'ok' }
  | { status: 'error'; category: string; deviceNotRegistered: boolean };

export type PushTicket =
  { status: 'ok'; id: string } | Exclude<PushOutcome, { status: 'ok' }>;

export interface PushProvider {
  send(messages: PushMessage[]): Promise<PushTicket[]>;
  getReceipts(ticketIds: string[]): Promise<Map<string, PushOutcome>>;
}

// Network failures, rate limits, and provider outages: retried with backoff.
export class TransientPushError extends Error {
  constructor(
    readonly category: string,
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(`Transient push failure: ${category}`);
  }
}

// Invalid payloads and credentials: retrying cannot help (ADR-0064).
export class PermanentPushError extends Error {
  constructor(readonly category: string) {
    super(`Permanent push failure: ${category}`);
  }
}
