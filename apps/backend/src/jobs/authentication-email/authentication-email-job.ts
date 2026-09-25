import type { Queue } from 'pg-boss';
import { z } from 'zod';

export const AUTHENTICATION_EMAIL_QUEUE =
  'system.authentication-email.v1' as const;
export const AUTHENTICATION_EMAIL_FAILED_QUEUE =
  'system.authentication-email.failed.v1' as const;

const authenticationEmailJobSchema = z
  .object({
    version: z.literal(1),
    accountId: z.uuid(),
    authenticationTokenId: z.uuid(),
    // IDN-008: `email_change` carries the link to the pending new address;
    // `email_change_notice` tells the current address, without a link.
    purpose: z.enum([
      'verification',
      'activation',
      'password_recovery',
      'email_change',
      'email_change_notice',
    ]),
    encryptedLinkSecret: z.string().min(1),
    encryptionKeyId: z.string().min(1),
  })
  .strict();

export type AuthenticationEmailJob = z.infer<
  typeof authenticationEmailJobSchema
>;

export const authenticationEmailQueueOptions = {
  retryLimit: 3,
  retryDelay: 30,
  retryBackoff: true,
  retryDelayMax: 300,
  expireInSeconds: 30,
  retentionSeconds: 691_200,
  deleteAfterSeconds: 604_800,
  deadLetter: AUTHENTICATION_EMAIL_FAILED_QUEUE,
} satisfies Omit<Queue, 'name'>;

export const parseAuthenticationEmailJob = (
  value: unknown,
): AuthenticationEmailJob => authenticationEmailJobSchema.parse(value);
