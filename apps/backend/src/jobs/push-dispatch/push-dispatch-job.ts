import type { Queue } from 'pg-boss';
import { z } from 'zod';

export const PUSH_DISPATCH_QUEUE = 'notifications.push-dispatch.v1' as const;
export const PUSH_DISPATCH_FAILED_QUEUE =
  'notifications.push-dispatch.failed.v1' as const;

const pushDispatchJobSchema = z
  .object({
    version: z.literal(1),
    accountId: z.uuid(),
    businessEventKey: z.string().min(1),
  })
  .strict();

export type PushDispatchJob = z.infer<typeof pushDispatchJobSchema>;

export const pushDispatchQueueOptions = {
  retryLimit: 5,
  retryDelay: 30,
  retryBackoff: true,
  retryDelayMax: 900,
  expireInSeconds: 60,
  retentionSeconds: 691_200,
  deleteAfterSeconds: 604_800,
  deadLetter: PUSH_DISPATCH_FAILED_QUEUE,
} satisfies Omit<Queue, 'name'>;

export const pushDispatchFailedQueueOptions = {
  retryLimit: 0,
  retentionSeconds: 2_592_000,
  deleteAfterSeconds: 2_592_000,
} satisfies Omit<Queue, 'name'>;

export const parsePushDispatchJob = (value: unknown): PushDispatchJob =>
  pushDispatchJobSchema.parse(value);
