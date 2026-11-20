import { z } from 'zod';
import type { DatabaseSettings } from '../database/database-clients';

// REL-016: a script runs as a run of the migrate job, which carries the
// environment's secret group but not the API's service variables (such as
// AUTHENTICATION_LINK_BASE_URL), so the runner checks only the database it
// uses, like the backup job does. Two connections are enough for one script.
const scriptEnvironmentSchema = z.object({
  DATABASE_URL: z
    .url()
    .refine(
      (value) =>
        value.startsWith('postgresql://') || value.startsWith('postgres://'),
      'DATABASE_URL must use the PostgreSQL protocol',
    ),
  DATABASE_POOL_MAX: z.coerce.number().int().min(2).max(20).default(2),
});

export const validateScriptEnvironment = (
  values: Record<string, unknown>,
): DatabaseSettings => scriptEnvironmentSchema.parse(values);

export type ScriptAuthenticationKeys = {
  emailDigestKey: string;
  linkEncryptionKey: Buffer;
  linkEncryptionKeyId: string;
};

// A script that invites people queues the Activation Link email the API
// would, so it uses the secret group's keys. Unlike the API's environment
// there is no local default: a link sealed with another key never opens.
const authenticationKeysSchema = z.object({
  AUTHENTICATION_EMAIL_DIGEST_KEY: z.string().min(32),
  AUTHENTICATION_LINK_ENCRYPTION_KEY: z
    .string()
    .refine(
      (value) => Buffer.from(value, 'base64').length === 32,
      'AUTHENTICATION_LINK_ENCRYPTION_KEY must encode exactly 32 bytes',
    ),
  AUTHENTICATION_LINK_ENCRYPTION_KEY_ID: z.string().min(1),
});

export const scriptAuthenticationKeys = (
  values: Record<string, unknown>,
): ScriptAuthenticationKeys | null => {
  const names = Object.keys(authenticationKeysSchema.shape);
  if (names.every((name) => values[name] === undefined)) return null;
  const keys = authenticationKeysSchema.parse(values);
  return {
    emailDigestKey: keys.AUTHENTICATION_EMAIL_DIGEST_KEY,
    linkEncryptionKey: Buffer.from(
      keys.AUTHENTICATION_LINK_ENCRYPTION_KEY,
      'base64',
    ),
    linkEncryptionKeyId: keys.AUTHENTICATION_LINK_ENCRYPTION_KEY_ID,
  };
};
