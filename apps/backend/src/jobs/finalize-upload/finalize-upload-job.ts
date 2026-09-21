import type { Queue } from 'pg-boss';
import { z } from 'zod';

export const FINALIZE_UPLOAD_QUEUE = 'uploads.finalize.v1' as const;
export const FINALIZE_UPLOAD_FAILED_QUEUE = 'uploads.finalize.failed.v1' as const;

const finalizeUploadJobSchema = z
  .object({
    version: z.literal(1),
    imageAssetId: z.uuid(),
  })
  .strict();

export type FinalizeUploadJob = z.infer<typeof finalizeUploadJobSchema>;

export const finalizeUploadQueueOptions = {
  retryLimit: 2,
  retryDelay: 5,
  retryBackoff: true,
  retryDelayMax: 60,
  expireInSeconds: 60,
  retentionSeconds: 691_200,
  deleteAfterSeconds: 604_800,
  deadLetter: FINALIZE_UPLOAD_FAILED_QUEUE,
} satisfies Omit<Queue, 'name'>;

export const parseFinalizeUploadJob = (value: unknown): FinalizeUploadJob =>
  finalizeUploadJobSchema.parse(value);
