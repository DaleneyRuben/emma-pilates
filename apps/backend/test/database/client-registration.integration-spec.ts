import { createHmac, randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PgBoss } from 'pg-boss';
import {
  AuthenticationThrottleEventKind,
  AuthenticationTokenPurpose,
} from '../../src/generated/prisma/enums';
import { PrismaClient } from '../../src/generated/prisma/client';
import {
  AUTHENTICATION_EMAIL_QUEUE,
  parseAuthenticationEmailJob,
} from '../../src/jobs/authentication-email/authentication-email-job';
import { CancelPendingClientRegistration } from '../../src/system-identity/registration/cancel-pending-client-registration';
import { CleanupExpiredPendingAccounts } from '../../src/system-identity/registration/cleanup-expired-pending-accounts';
import { CorrectPendingClientEmail } from '../../src/system-identity/registration/correct-pending-client-email';
import { PrismaClientRegistrationUnitOfWork } from '../../src/system-identity/registration/prisma-client-registration-unit-of-work';
import { RegisterClient } from '../../src/system-identity/registration/register-client';
import { ResendPendingClientVerification } from '../../src/system-identity/registration/resend-pending-client-verification';
import { VerifyClientEmail } from '../../src/system-identity/registration/verify-client-email';
import { AuthenticationLinkCipher } from '../../src/system-identity/security/authentication-link-cipher';
import { authenticationTokens } from '../../src/system-identity/security/authentication-token-service';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

describe('Client registration transaction', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let boss: PgBoss;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
    boss = new PgBoss({
      db: {
        executeSql: async (text, values) => {
          const result = await context.pool.query(text, values);
          return { rows: result.rows };
        },
      },
      schema: 'pgboss',
      migrate: false,
    });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('commits the pending Account, Client, digests, throttle event, and encrypted email job together', async () => {
    const now = new Date(Date.now() + 60_000);
    const tokens = authenticationTokens;
    const registerClient = new RegisterClient({
      unitOfWork: new PrismaClientRegistrationUnitOfWork({
        prisma,
        boss,
        digestEmail: (email) =>
          createHmac('sha256', 'test-email-digest-key').update(email).digest(),
      }),
      passwordHasher: {
        hash: () => Promise.resolve('argon2id-password-hash'),
      },
      tokenIssuer: tokens,
      linkCipher: new AuthenticationLinkCipher(
        'local-test-key',
        Buffer.alloc(32, 7),
      ),
      now: () => now,
      newId: randomUUID,
      newReferralCode: () => `REF-${randomUUID()}`,
    });

    const result = await registerClient.execute({
      name: '  Ana Pérez  ',
      email: ` ANA-${randomUUID()}@Example.COM `,
      password: 'correct horse battery staple',
    });
    const account = await prisma.account.findFirstOrThrow({
      where: { email: result.email, deletedAt: null },
      include: { client: true, authenticationTokens: true },
    });
    const verificationToken = account.authenticationTokens.find(
      ({ purpose }) => purpose === AuthenticationTokenPurpose.VERIFICATION,
    );
    const continuationToken = account.authenticationTokens.find(
      ({ purpose }) =>
        purpose === AuthenticationTokenPurpose.REGISTRATION_CONTINUATION,
    );
    const throttleEvents = await prisma.authenticationThrottleEvent.findMany({
      where: {
        purpose: 'VERIFICATION',
        eventKind: AuthenticationThrottleEventKind.MESSAGE_ISSUED,
        recipientDigest: new Uint8Array(digestTestEmail(result.email)),
        occurredAt: now,
      },
    });
    const jobs = await boss.findJobs(AUTHENTICATION_EMAIL_QUEUE, {
      id: undefined,
    });
    const registrationJob = jobs.find(
      ({ data }) =>
        typeof data === 'object' &&
        data !== null &&
        'accountId' in data &&
        data.accountId === account.id,
    );

    expect(account).toMatchObject({
      email: result.email.toLowerCase(),
      passwordHash: 'argon2id-password-hash',
      emailVerifiedAt: null,
      activatedAt: null,
      pendingExpiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1_000),
      client: { name: 'Ana Pérez' },
    });
    expect(account.authenticationTokens).toHaveLength(2);
    expect(verificationToken?.expiresAt).toEqual(
      new Date(now.getTime() + 24 * 60 * 60 * 1_000),
    );
    expect(continuationToken).toBeDefined();
    expect(
      tokens.matches(
        result.registrationContinuation,
        continuationToken?.tokenDigest ?? new Uint8Array(),
      ),
    ).toBe(true);
    expect(throttleEvents).toHaveLength(1);
    expect(registrationJob).toBeDefined();
    expect(JSON.stringify(registrationJob?.data)).not.toContain(
      result.registrationContinuation,
    );
    expect(JSON.stringify(registrationJob?.data)).not.toContain(
      'correct horse battery staple',
    );
    await expect(
      prisma.authenticationSession.count({
        where: { accountId: account.id },
      }),
    ).resolves.toBe(0);
  });

  it('corrects a pending email without replacing the Account or Client', async () => {
    const registeredAt = new Date(Date.now() + 60_000);
    const correctedAt = new Date(registeredAt.getTime() + 60 * 60 * 1_000);
    const tokens = authenticationTokens;
    const cipher = new AuthenticationLinkCipher(
      'local-test-key',
      Buffer.alloc(32, 7),
    );
    const gateway = new PrismaClientRegistrationUnitOfWork({
      prisma,
      boss,
      digestEmail: digestTestEmail,
      now: () => correctedAt,
    });
    const registerClient = new RegisterClient({
      unitOfWork: gateway,
      passwordHasher: {
        hash: () => Promise.resolve('original-password-hash'),
      },
      tokenIssuer: tokens,
      linkCipher: cipher,
      now: () => registeredAt,
      newId: randomUUID,
      newReferralCode: () => `REF-${randomUUID()}`,
    });
    const originalEmail = `original-${randomUUID()}@example.com`;
    const registration = await registerClient.execute({
      name: 'Original Name',
      email: originalEmail,
      password: 'original password',
    });
    const originalAccount = await prisma.account.findFirstOrThrow({
      where: { email: originalEmail, deletedAt: null },
      include: { authenticationTokens: true },
    });
    const correction = new CorrectPendingClientEmail({
      gateway,
      tokens,
      linkCipher: cipher,
      now: () => correctedAt,
      newId: randomUUID,
    });
    const correctedEmail = `corrected-${randomUUID()}@example.com`;

    await expect(
      correction.execute({
        registrationContinuation: registration.registrationContinuation,
        email: correctedEmail,
      }),
    ).resolves.toEqual({ status: 'corrected', email: correctedEmail });
    await expect(
      prisma.account.findFirst({
        where: { email: originalEmail, deletedAt: null },
      }),
    ).resolves.toBeNull();
    const correctedAccount = await prisma.account.findFirstOrThrow({
      where: { email: correctedEmail, deletedAt: null },
      include: { client: true, authenticationTokens: true },
    });
    const currentVerificationTokens =
      correctedAccount.authenticationTokens.filter(
        ({ purpose, invalidatedAt, usedAt }) =>
          purpose === AuthenticationTokenPurpose.VERIFICATION &&
          invalidatedAt === null &&
          usedAt === null,
      );
    const continuation = correctedAccount.authenticationTokens.find(
      ({ purpose }) =>
        purpose === AuthenticationTokenPurpose.REGISTRATION_CONTINUATION,
    );

    expect(correctedAccount).toMatchObject({
      id: originalAccount.id,
      clientId: originalAccount.clientId,
      passwordHash: 'original-password-hash',
      pendingExpiresAt: new Date(
        correctedAt.getTime() + 7 * 24 * 60 * 60 * 1_000,
      ),
      client: { name: 'Original Name' },
    });
    expect(currentVerificationTokens).toHaveLength(1);
    expect(currentVerificationTokens[0]?.expiresAt).toEqual(
      new Date(correctedAt.getTime() + 24 * 60 * 60 * 1_000),
    );
    expect(continuation?.expiresAt).toEqual(
      new Date(correctedAt.getTime() + 7 * 24 * 60 * 60 * 1_000),
    );

    const resentAt = new Date(correctedAt.getTime() + 61_000);
    const resend = new ResendPendingClientVerification({
      gateway,
      tokens,
      linkCipher: cipher,
      now: () => resentAt,
      newId: randomUUID,
    });

    await expect(
      resend.execute({
        registrationContinuation: registration.registrationContinuation,
      }),
    ).resolves.toEqual({ status: 'sent' });
    const tokensAfterResend = await prisma.authenticationToken.findMany({
      where: { accountId: originalAccount.id },
    });
    const currentAfterResend = tokensAfterResend.filter(
      ({ purpose, invalidatedAt, usedAt }) =>
        purpose === AuthenticationTokenPurpose.VERIFICATION &&
        invalidatedAt === null &&
        usedAt === null,
    );

    expect(currentAfterResend).toHaveLength(1);
    expect(currentAfterResend[0]?.expiresAt).toEqual(
      new Date(resentAt.getTime() + 24 * 60 * 60 * 1_000),
    );
  });

  it('cancels a pending self-registration by marking its Account and Client removed and invalidating its links', async () => {
    const registeredAt = new Date(Date.now() + 120_000);
    const cancelledAt = new Date(registeredAt.getTime() + 60_000);
    const tokens = authenticationTokens;
    const gateway = new PrismaClientRegistrationUnitOfWork({
      prisma,
      boss,
      digestEmail: digestTestEmail,
    });
    const registration = await new RegisterClient({
      unitOfWork: gateway,
      passwordHasher: {
        hash: () => Promise.resolve('cancelled-password-hash'),
      },
      tokenIssuer: tokens,
      linkCipher: new AuthenticationLinkCipher(
        'local-test-key',
        Buffer.alloc(32, 7),
      ),
      now: () => registeredAt,
      newId: randomUUID,
      newReferralCode: () => `REF-${randomUUID()}`,
    }).execute({
      name: 'Cancelled Client',
      email: `cancelled-${randomUUID()}@example.com`,
      password: 'cancelled password',
    });
    const pendingAccount = await prisma.account.findFirstOrThrow({
      where: { email: registration.email, deletedAt: null },
    });
    const correlationId = randomUUID();
    const cancel = new CancelPendingClientRegistration({
      gateway,
      tokens,
      now: () => cancelledAt,
      newId: () => correlationId,
    });

    await expect(
      cancel.execute({
        registrationContinuation: registration.registrationContinuation,
      }),
    ).resolves.toEqual({ status: 'cancelled' });
    await expect(
      prisma.account.findUniqueOrThrow({ where: { id: pendingAccount.id } }),
    ).resolves.toMatchObject({ deletedAt: cancelledAt });
    await expect(
      prisma.client.findUniqueOrThrow({
        where: { id: pendingAccount.clientId! },
      }),
    ).resolves.toMatchObject({ deletedAt: cancelledAt });
    await expect(
      prisma.authenticationToken.count({
        where: {
          accountId: pendingAccount.id,
          usedAt: null,
          invalidatedAt: null,
        },
      }),
    ).resolves.toBe(0);
    await expect(
      prisma.auditRecord.findFirstOrThrow({ where: { correlationId } }),
    ).resolves.toMatchObject({
      actionCode: 'pending_client_registration.cancelled',
      outcome: 'SUCCEEDED',
      actorKind: 'SYSTEM',
      actorAccountId: null,
      targetType: 'account',
      targetId: pendingAccount.id,
      correlationId,
      metadata: { initiatedBy: 'registration_continuation' },
      occurredAt: cancelledAt,
    });
  });

  it('verifies and activates a pending Client without creating a session', async () => {
    const registeredAt = new Date(Date.now() + 180_000);
    const verifiedAt = new Date(registeredAt.getTime() + 60_000);
    const tokens = authenticationTokens;
    const cipher = new AuthenticationLinkCipher(
      'local-test-key',
      Buffer.alloc(32, 7),
    );
    const gateway = new PrismaClientRegistrationUnitOfWork({
      prisma,
      boss,
      digestEmail: digestTestEmail,
    });
    const registration = await new RegisterClient({
      unitOfWork: gateway,
      passwordHasher: {
        hash: () => Promise.resolve('verified-password-hash'),
      },
      tokenIssuer: tokens,
      linkCipher: cipher,
      now: () => registeredAt,
      newId: randomUUID,
      newReferralCode: () => `REF-${randomUUID()}`,
    }).execute({
      name: 'Verified Client',
      email: `verified-${randomUUID()}@example.com`,
      password: 'verified password',
    });
    const pendingAccount = await prisma.account.findFirstOrThrow({
      where: { email: registration.email, deletedAt: null },
    });
    const jobs = await boss.findJobs(AUTHENTICATION_EMAIL_QUEUE, {
      id: undefined,
    });
    const verificationJob = parseAuthenticationEmailJob(
      jobs.find(
        ({ data }) =>
          typeof data === 'object' &&
          data !== null &&
          'accountId' in data &&
          data.accountId === pendingAccount.id,
      )?.data,
    );
    const verificationSecret = await cipher.decrypt(
      verificationJob.encryptedLinkSecret,
      verificationJob.encryptionKeyId,
    );
    const verify = new VerifyClientEmail({
      gateway,
      tokens,
      now: () => verifiedAt,
    });

    await expect(
      verify.execute({ verificationToken: verificationSecret }),
    ).resolves.toEqual({ status: 'verified' });
    const verifiedAccount = await prisma.account.findUniqueOrThrow({
      where: { id: pendingAccount.id },
      include: { authenticationTokens: true },
    });

    expect(verifiedAccount).toMatchObject({
      emailVerifiedAt: verifiedAt,
      activatedAt: verifiedAt,
      pendingExpiresAt: null,
    });
    expect(
      verifiedAccount.authenticationTokens.find(
        ({ id }) => id === verificationJob.authenticationTokenId,
      )?.usedAt,
    ).toEqual(verifiedAt);
    expect(
      verifiedAccount.authenticationTokens.find(
        ({ purpose }) =>
          purpose === AuthenticationTokenPurpose.REGISTRATION_CONTINUATION,
      )?.invalidatedAt,
    ).toEqual(verifiedAt);
    await expect(
      prisma.authenticationSession.count({
        where: { accountId: pendingAccount.id },
      }),
    ).resolves.toBe(0);
  });

  it('cleans up an expired pending Account and its provisional Client by marking them removed', async () => {
    const registeredAt = new Date();
    const cleanupAt = new Date(
      registeredAt.getTime() + 8 * 24 * 60 * 60 * 1_000,
    );
    const gateway = new PrismaClientRegistrationUnitOfWork({
      prisma,
      boss,
      digestEmail: digestTestEmail,
    });
    const registration = await new RegisterClient({
      unitOfWork: gateway,
      passwordHasher: {
        hash: () => Promise.resolve('expired-password-hash'),
      },
      tokenIssuer: authenticationTokens,
      linkCipher: new AuthenticationLinkCipher(
        'local-test-key',
        Buffer.alloc(32, 7),
      ),
      now: () => registeredAt,
      newId: randomUUID,
      newReferralCode: () => `REF-${randomUUID()}`,
    }).execute({
      name: 'Expired Client',
      email: `expired-${randomUUID()}@example.com`,
      password: 'expired password',
    });
    const pendingAccount = await prisma.account.findFirstOrThrow({
      where: { email: registration.email, deletedAt: null },
    });
    const correlationId = randomUUID();
    const cleanup = new CleanupExpiredPendingAccounts({
      gateway,
      now: () => cleanupAt,
      newId: () => correlationId,
    });

    const result = await cleanup.execute();

    expect(result.cleaned).toBeGreaterThanOrEqual(1);
    await expect(
      prisma.account.findUniqueOrThrow({ where: { id: pendingAccount.id } }),
    ).resolves.toMatchObject({ deletedAt: cleanupAt });
    await expect(
      prisma.client.findUniqueOrThrow({
        where: { id: pendingAccount.clientId! },
      }),
    ).resolves.toMatchObject({ deletedAt: cleanupAt });
    await expect(
      prisma.authenticationToken.count({
        where: {
          accountId: pendingAccount.id,
          usedAt: null,
          invalidatedAt: null,
        },
      }),
    ).resolves.toBe(0);
    await expect(
      prisma.auditRecord.findFirstOrThrow({
        where: { correlationId, targetId: pendingAccount.id },
      }),
    ).resolves.toMatchObject({
      actionCode: 'pending_account.expired',
      outcome: 'SUCCEEDED',
      actorKind: 'SYSTEM',
      actorAccountId: null,
      targetType: 'account',
      targetId: pendingAccount.id,
      correlationId,
      metadata: { domainIdentity: 'client' },
      occurredAt: cleanupAt,
    });
  });

  it('attributes the referrer at signup and refuses unknown referral codes atomically', async () => {
    const now = new Date(Date.now() + 60_000);
    const referrer = await prisma.client.create({
      data: {
        name: 'Lucía Referente',
        referralCode: `REF-LUCIA-${randomUUID().slice(0, 6).toUpperCase()}`,
      },
      select: { id: true, referralCode: true },
    });
    const registerClient = new RegisterClient({
      unitOfWork: new PrismaClientRegistrationUnitOfWork({
        prisma,
        boss,
        digestEmail: (email) =>
          createHmac('sha256', 'test-email-digest-key').update(email).digest(),
      }),
      passwordHasher: {
        hash: () => Promise.resolve('argon2id-password-hash'),
      },
      tokenIssuer: authenticationTokens,
      linkCipher: new AuthenticationLinkCipher(
        'local-test-key',
        Buffer.alloc(32, 7),
      ),
      now: () => now,
      newId: randomUUID,
      newReferralCode: () => `REF-${randomUUID()}`,
    });

    const result = await registerClient.execute({
      name: 'Referida Nueva',
      email: `referida-${randomUUID()}@example.com`,
      password: 'correct horse battery staple',
      referralCode: referrer.referralCode.toLowerCase(),
    });
    const referred = await prisma.account.findFirstOrThrow({
      where: { email: result.email, deletedAt: null },
      select: { clientId: true },
    });
    await expect(
      prisma.referral.findUniqueOrThrow({
        where: { referredClientId: referred.clientId! },
      }),
    ).resolves.toMatchObject({
      referrerClientId: referrer.id,
      state: 'PENDING',
    });

    const unknownEmail = `sin-referente-${randomUUID()}@example.com`;
    await expect(
      registerClient.execute({
        name: 'Sin Referente',
        email: unknownEmail,
        password: 'correct horse battery staple',
        referralCode: 'REF-NOBODY',
      }),
    ).rejects.toMatchObject({ code: 'referral_code_invalid' });
    await expect(
      prisma.account.findFirst({
        where: { email: unknownEmail, deletedAt: null },
      }),
    ).resolves.toBeNull();
  });
});

const digestTestEmail = (email: string): Buffer =>
  createHmac('sha256', 'test-email-digest-key').update(email).digest();
