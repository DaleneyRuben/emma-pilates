import { z } from 'zod';

const localLinkEncryptionKey = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
const localLinkEncryptionKeyId = 'local-development-v1';
const localEmailDigestKey = 'local-development-email-digest-key';
const localTransferQrImagePath = '.data/transfer-qr.png';
const localAdminWebOrigin = 'http://localhost:5173';
// The HTTPS host the apps accept for authentication links (ADR-0036); the
// real domain is LNK-001's, so production must set it explicitly.
const localLinkBaseUrl = 'https://links.emmapilates.test';

// ADR-0084: exact scheme, host, and port only; a wildcard, path, or bare
// host is never a trusted credentialed origin.
const isExactOrigin = (value: string): boolean => {
  try {
    const url = new URL(value);
    return (
      !value.includes('*') &&
      (url.protocol === 'https:' || url.protocol === 'http:') &&
      url.origin === value
    );
  } catch {
    return false;
  }
};

const trustedOriginsSchema = z
  .string()
  .default(localAdminWebOrigin)
  .transform((value) => value.split(',').map((origin) => origin.trim()))
  .refine(
    (origins) => origins.length > 0 && origins.every(isExactOrigin),
    'ADMIN_WEB_TRUSTED_ORIGINS must list exact http(s) origins separated by commas',
  );

// Bs 60; any other reward needs separate product approval (PAY-001).
const approvedReferralRewardCentavos = 6000;

const objectStorageSettings = [
  'OBJECT_STORAGE_ENDPOINT',
  'OBJECT_STORAGE_BUCKET',
  'OBJECT_STORAGE_ACCESS_KEY_ID',
  'OBJECT_STORAGE_SECRET_ACCESS_KEY',
] as const;

const environmentSchema = z
  .object({
    ADMIN_WEB_TRUSTED_ORIGINS: trustedOriginsSchema,
    // ADR-0087: the admin web's Vercel middleware proves its hop with this.
    ADMIN_WEB_PROXY_SECRET: z.string().min(32).nullable().default(null),
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
    AUTHENTICATION_LINK_BASE_URL: z
      .url()
      .refine(
        (value) => value.startsWith('https://'),
        'AUTHENTICATION_LINK_BASE_URL must use HTTPS',
      )
      .default(localLinkBaseUrl),
    DATABASE_URL: z
      .url()
      .refine(
        (value) =>
          value.startsWith('postgresql://') || value.startsWith('postgres://'),
        'DATABASE_URL must use the PostgreSQL protocol',
      ),
    // Most connections one process holds across its Prisma and pg-boss pools;
    // Aiven Free caps the server at 20 (ADR-0027 budgets four per process).
    DATABASE_POOL_MAX: z.coerce.number().int().min(2).max(20).default(10),
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().max(65_535).default(3100),
    // ADR-0087: proxies the hosting platform always puts in front of the API.
    TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
    // Release identifier reported by readiness and logs (ADR-0080/0081).
    RELEASE_ID: z.string().min(1).default('local'),
    REFERRAL_REWARD_CENTAVOS: z.coerce
      .number()
      .refine(
        (value) => value === approvedReferralRewardCentavos,
        `REFERRAL_REWARD_CENTAVOS must be ${approvedReferralRewardCentavos}`,
      )
      .default(approvedReferralRewardCentavos),
    // PAY-003: the studio's QR image is the only transfer instruction.
    TRANSFER_QR_IMAGE_PATH: z.string().min(1).default(localTransferQrImagePath),
    // ADR-0088: local disk outside production, R2's S3 API in production.
    OBJECT_STORAGE: z.enum(['local', 's3']).default('local'),
    UPLOADS_LOCAL_STORAGE_ROOT: z.string().min(1).default('.data/uploads'),
    OBJECT_STORAGE_ENDPOINT: z.url().nullable().default(null),
    OBJECT_STORAGE_REGION: z.string().min(1).default('auto'),
    OBJECT_STORAGE_BUCKET: z.string().min(1).nullable().default(null),
    OBJECT_STORAGE_ACCESS_KEY_ID: z.string().min(1).nullable().default(null),
    OBJECT_STORAGE_SECRET_ACCESS_KEY: z
      .string()
      .min(1)
      .nullable()
      .default(null),
    // ADR-0081: Better Stack's error-tracking DSN; unset reports nothing.
    ERROR_REPORTING_DSN: z.url().nullable().default(null),
    // EXT-017: staging runs with NODE_ENV=production like production itself,
    // so it names its environment here; unset reports NODE_ENV.
    ERROR_REPORTING_ENVIRONMENT: z.string().min(1).nullable().default(null),
    // ADR-0066: Better Stack's heartbeat URL for the worker; unset pings
    // nothing.
    WORKER_HEARTBEAT_URL: z
      .url()
      .refine(
        (value) => value.startsWith('https://'),
        'WORKER_HEARTBEAT_URL must use HTTPS',
      )
      .nullable()
      .default(null),
    // NOT-002: Expo's access token, required once enhanced push security is
    // on; unset sends pushes without one.
    EXPO_ACCESS_TOKEN: z.string().min(1).nullable().default(null),
    // ADR-0094: Resend's sending-only API key; unset captures email locally
    // outside production and leaves the queue untouched in production.
    RESEND_API_KEY: z.string().min(1).nullable().default(null),
    EMAIL_FROM: z
      .string()
      .min(1)
      .default('Emma Pilates Studio <no-responder@emmapilatesstudio.com>'),
    EMAIL_REPLY_TO: z.email().default('soporte@emmapilatesstudio.com'),
    // Where the local email capture writes each message (never production).
    EMAIL_CAPTURE_DIRECTORY: z.string().min(1).default('.data/email-capture'),
  })
  .superRefine((environment, context) => {
    if (environment.OBJECT_STORAGE === 's3') {
      objectStorageSettings.forEach((name) => {
        if (environment[name] === null) {
          context.addIssue({
            code: 'custom',
            message: `${name} is required for S3-compatible object storage`,
            path: [name],
          });
        }
      });
    }

    if (environment.NODE_ENV !== 'production') {
      return;
    }

    if (environment.OBJECT_STORAGE !== 's3') {
      context.addIssue({
        code: 'custom',
        message: 'OBJECT_STORAGE must be s3 in production',
        path: ['OBJECT_STORAGE'],
      });
    }
    if (environment.OBJECT_STORAGE_ENDPOINT?.startsWith('http://')) {
      context.addIssue({
        code: 'custom',
        message: 'OBJECT_STORAGE_ENDPOINT must use HTTPS in production',
        path: ['OBJECT_STORAGE_ENDPOINT'],
      });
    }

    const localDefaults: readonly (readonly [
      keyof typeof environment,
      string,
    ])[] = [
      ['AUTHENTICATION_EMAIL_DIGEST_KEY', localEmailDigestKey],
      ['AUTHENTICATION_LINK_ENCRYPTION_KEY', localLinkEncryptionKey],
      ['AUTHENTICATION_LINK_ENCRYPTION_KEY_ID', localLinkEncryptionKeyId],
      ['AUTHENTICATION_LINK_BASE_URL', localLinkBaseUrl],
      ['TRANSFER_QR_IMAGE_PATH', localTransferQrImagePath],
    ];

    const origins = environment.ADMIN_WEB_TRUSTED_ORIGINS;
    if (
      origins.includes(localAdminWebOrigin) ||
      origins.some((origin) => !origin.startsWith('https://'))
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'ADMIN_WEB_TRUSTED_ORIGINS must list explicit https origins in production',
        path: ['ADMIN_WEB_TRUSTED_ORIGINS'],
      });
    }

    localDefaults.forEach(([name, localDefault]) => {
      if (environment[name] === localDefault) {
        context.addIssue({
          code: 'custom',
          message: `${name} must be configured explicitly in production`,
          path: [name],
        });
      }
    });
  })
  .transform((environment) => ({
    ...environment,
    ERROR_REPORTING_ENVIRONMENT:
      environment.ERROR_REPORTING_ENVIRONMENT ?? environment.NODE_ENV,
  }));

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(
  values: Record<string, unknown>,
): Environment {
  return environmentSchema.parse(values);
}
