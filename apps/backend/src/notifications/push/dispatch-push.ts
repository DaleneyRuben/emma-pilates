import type { PushDispatchJob } from '../../jobs/push-dispatch/push-dispatch-job';
import type { PushMessage, PushTicket } from './push-provider';

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

export const dispatchPush = (
  job: PushDispatchJob,
  dependencies: DispatchPushDependencies,
): Promise<DispatchPushResult> =>
  Promise.reject(
    new Error(`not implemented ${job.accountId} ${typeof dependencies}`),
  );
