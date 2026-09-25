import { z } from 'zod';

const localLinkEncryptionKey = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
const localLinkEncryptionKeyId = 'local-development-v1';
const localEmailDigestKey = 'local-development-email-digest-key';
const localTransferInstructions = {
  TRANSFER_BENEFICIARY_NAME: 'Emma Pilates Studio',
  TRANSFER_BANK_NAME: 'Banco de desarrollo local',
  TRANSFER_ACCOUNT_NUMBER: '0000000000',
  TRANSFER_QR_IMAGE_PATH: '.data/transfer-qr.png',
} as const;
const localAdminWebOrigin = 'http://localhost:5173';

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

const environmentSchema = z
  .object({
    ADMIN_WEB_TRUSTED_ORIGINS: trustedOriginsSchema,
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
    PORT: z.coerce.number().int().positive().max(65_535).default(3100),
    // Release identifier reported by readiness and logs (ADR-0080/0081).
    RELEASE_ID: z.string().min(1).default('local'),
    REFERRAL_REWARD_CENTAVOS: z.coerce
      .number()
      .refine(
        (value) => value === approvedReferralRewardCentavos,
        `REFERRAL_REWARD_CENTAVOS must be ${approvedReferralRewardCentavos}`,
      )
      .default(approvedReferralRewardCentavos),
    TRANSFER_ACCOUNT_NUMBER: z
      .string()
      .min(1)
      .default(localTransferInstructions.TRANSFER_ACCOUNT_NUMBER),
    TRANSFER_BANK_NAME: z
      .string()
      .min(1)
      .default(localTransferInstructions.TRANSFER_BANK_NAME),
    TRANSFER_BENEFICIARY_NAME: z
      .string()
      .min(1)
      .default(localTransferInstructions.TRANSFER_BENEFICIARY_NAME),
    TRANSFER_QR_IMAGE_PATH: z
      .string()
      .min(1)
      .default(localTransferInstructions.TRANSFER_QR_IMAGE_PATH),
    UPLOADS_LOCAL_STORAGE_ROOT: z.string().min(1).default('.data/uploads'),
    // Where the local email capture writes each message (never production).
    EMAIL_CAPTURE_DIRECTORY: z.string().min(1).default('.data/email-capture'),
  })
  .superRefine((environment, context) => {
    if (environment.NODE_ENV !== 'production') {
      return;
    }

    const localDefaults: readonly (readonly [
      keyof typeof environment,
      string,
    ])[] = [
      ['AUTHENTICATION_EMAIL_DIGEST_KEY', localEmailDigestKey],
      ['AUTHENTICATION_LINK_ENCRYPTION_KEY', localLinkEncryptionKey],
      ['AUTHENTICATION_LINK_ENCRYPTION_KEY_ID', localLinkEncryptionKeyId],
      ...(Object.entries(localTransferInstructions) as [
        keyof typeof localTransferInstructions,
        string,
      ][]),
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
  });

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(
  values: Record<string, unknown>,
): Environment {
  return environmentSchema.parse(values);
}
