import type { PushDispatchJob } from '../../jobs/push-dispatch/push-dispatch-job';
import { presentNotification } from './notification-catalog';
import {
  maxMessagesPerRequest,
  PermanentPushError,
  TransientPushError,
  type PushMessage,
  type PushTicket,
} from './push-provider';

export type PendingDelivery = {
  deliveryId: string;
  deviceId: string;
  expoPushToken: string;
};

export type DispatchedTicket = {
  deliveryId: string;
  deviceId: string;
  ticket: PushTicket;
};

export type DispatchNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  destinationType: string | null;
  destinationId: string | null;
};

export type DispatchPushDependencies = {
  findNotification: (input: {
    accountId: string;
    businessEventKey: string;
  }) => Promise<DispatchNotification | null>;
  prepareDeliveries: (input: {
    notificationId: string;
    accountId: string;
  }) => Promise<PendingDelivery[]>;
  countUnread: (accountId: string) => Promise<number>;
  send: (messages: PushMessage[]) => Promise<PushTicket[]>;
  recordTickets: (tickets: DispatchedTicket[], at: Date) => Promise<void>;
  recordAttempt: (
    deliveryIds: string[],
    failure: { category: string; final: boolean },
    at: Date,
  ) => Promise<void>;
  now: () => Date;
};

export type DispatchPushResult =
  | { outcome: 'stale' | 'no_devices' }
  | { outcome: 'sent'; submitted: number; failed: number };

const chunk = <Item>(items: Item[], size: number): Item[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );

const toMessage = (
  notification: DispatchNotification,
  delivery: PendingDelivery,
  unread: number,
): PushMessage => {
  const { sound, lockScreen } = presentNotification(notification.type);
  const text =
    lockScreen === 'entry'
      ? { title: notification.title, body: notification.message }
      : { title: lockScreen.title, body: lockScreen.body };

  return {
    to: delivery.expoPushToken,
    ...text,
    sound: sound ? 'default' : null,
    // ADR-0069: the expected count; the app applies the authoritative one.
    badge: unread,
    channelId: sound ? 'actionable' : 'updates',
    priority: sound ? 'high' : 'normal',
    // ADR-0036: identifiers only, never a URL or the entry's text.
    data: {
      notificationId: notification.id,
      type: notification.type,
      destinationType: notification.destinationType,
      destinationId: notification.destinationId,
    },
  };
};

// Delivery is at-least-once (ADR-0024): a retry finds the deliveries a previous
// attempt already submitted and sends only the ones still queued.
export const dispatchPush = async (
  job: PushDispatchJob,
  dependencies: DispatchPushDependencies,
): Promise<DispatchPushResult> => {
  const notification = await dependencies.findNotification(job);
  if (notification === null) return { outcome: 'stale' };

  const deliveries = await dependencies.prepareDeliveries({
    notificationId: notification.id,
    accountId: job.accountId,
  });
  if (deliveries.length === 0) return { outcome: 'no_devices' };

  const unread = await dependencies.countUnread(job.accountId);
  let submitted = 0;
  let failed = 0;
  const rateLimited: string[] = [];

  for (const batch of chunk(deliveries, maxMessagesPerRequest)) {
    const at = dependencies.now();
    let tickets: PushTicket[];
    try {
      tickets = await dependencies.send(
        batch.map((delivery) => toMessage(notification, delivery, unread)),
      );
    } catch (error) {
      if (
        error instanceof TransientPushError ||
        error instanceof PermanentPushError
      ) {
        await dependencies.recordAttempt(
          batch.map(({ deliveryId }) => deliveryId),
          {
            category: error.category,
            final: error instanceof PermanentPushError,
          },
          at,
        );
      }
      throw error;
    }

    const recorded: DispatchedTicket[] = [];
    batch.forEach(({ deliveryId, deviceId }, index) => {
      const ticket = tickets[index];
      if (ticket.status === 'error' && ticket.category === 'rate_exceeded') {
        rateLimited.push(deliveryId);
        return;
      }
      if (ticket.status === 'ok') submitted += 1;
      else failed += 1;
      recorded.push({ deliveryId, deviceId, ticket });
    });
    await dependencies.recordTickets(recorded, at);
  }

  if (rateLimited.length > 0) {
    await dependencies.recordAttempt(
      rateLimited,
      { category: 'rate_exceeded', final: false },
      dependencies.now(),
    );
    throw new TransientPushError('rate_exceeded');
  }

  return { outcome: 'sent', submitted, failed };
};
