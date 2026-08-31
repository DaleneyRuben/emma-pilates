import { z } from 'zod';

const localLinkEncryptionKey = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
const localLinkEncryptionKeyId = 'local-development-v1';
const localEmailDigestKey = 'local-development-email-digest-key';

const environmentSchema = z
  .object({
    AUTHENTICATION_EMAIL_DIGEST_KEY: z
      .string()
      .min(32)
      .default(localEmailDigestKey),
    AUTHENTICATION_LINK_ENCRYPTION_KEY: z
      .string()
      .refine(
        (value) => Buffer.from(value, 'base64').length === 32,
        'AUTHENTICATION_LINK_ENCRYPTION_KEY must encode exactly 32 bytes',
      )
      .default(localLinkEncryptionKey),
    AUTHENTICATION_LINK_ENCRYPTION_KEY_ID: z
      .string()
      .min(1)
      .default(localLinkEncryptionKeyId),
    DATABASE_URL: z
      .url()
      .refine(
        (value) =>
          value.startsWith('postgresql://') || value.startsWith('postgres://'),
        'DATABASE_URL must use the PostgreSQL protocol',
      ),
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().max(65_535).default(3000),
  })
  .superRefine((environment, context) => {
    if (environment.NODE_ENV !== 'production') {
      return;
    }

    const localDefaults = [
      ['AUTHENTICATION_EMAIL_DIGEST_KEY', localEmailDigestKey],
      ['AUTHENTICATION_LINK_ENCRYPTION_KEY', localLinkEncryptionKey],
      ['AUTHENTICATION_LINK_ENCRYPTION_KEY_ID', localLinkEncryptionKeyId],
    ] as const;

    localDefaults.forEach(([name, localDefault]) => {
      if (environment[name] === localDefault) {
        context.addIssue({
          code: 'custom',
          message: `${name} must be configured explicitly in production`,
          path: [name],
        });
      }
    });
  });

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(
  values: Record<string, unknown>,
): Environment {
  return environmentSchema.parse(values);
}
