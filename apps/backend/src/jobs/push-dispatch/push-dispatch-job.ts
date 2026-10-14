import type { Queue } from 'pg-boss';

export const PUSH_DISPATCH_QUEUE = 'notifications.push-dispatch.v1' as const;
export const PUSH_DISPATCH_FAILED_QUEUE =
  'notifications.push-dispatch.failed.v1' as const;

export type PushDispatchJob = {
  version: 1;
  accountId: string;
  businessEventKey: string;
};

export const pushDispatchQueueOptions: Omit<Queue, 'name'> = {};

export const pushDispatchFailedQueueOptions: Omit<Queue, 'name'> = {};

export const parsePushDispatchJob = (value: unknown): PushDispatchJob => {
  throw new Error(`not implemented: ${typeof value}`);
};
