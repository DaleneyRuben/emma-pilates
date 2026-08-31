import { createHmac, randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PgBoss } from 'pg-boss';
import {
  AuthenticationThrottleEventKind,
  AuthenticationTokenPurpose,
} from '../../src/generated/prisma/enums';
import { PrismaClient } from '../../src/generated/prisma/client';
import { AUTHENTICATION_EMAIL_QUEUE } from '../../src/jobs/authentication-email/authentication-email-job';
import { CancelPendingClientRegistration } from '../../src/system-identity/registration/cancel-pending-client-registration';
import { CorrectPendingClientEmail } from '../../src/system-identity/registration/correct-pending-client-email';
import { PrismaClientRegistrationUnitOfWork } from '../../src/system-identity/registration/prisma-client-registration-unit-of-work';
import { RegisterClient } from '../../src/system-identity/registration/register-client';
import { ResendPendingClientVerification } from '../../src/system-identity/registration/resend-pending-client-verification';
import { AuthenticationLinkCipher } from '../../src/system-identity/security/authentication-link-cipher';
import { AuthenticationTokenService } from '../../src/system-identity/security/authentication-token-service';
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
    const now = new Date('2026-08-30T18:00:00.000Z');
    const tokens = new AuthenticationTokenService();
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
    const account = await prisma.account.findUniqueOrThrow({
      where: { email: result.email },
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
      pendingExpiresAt: new Date('2026-09-06T18:00:00.000Z'),
      client: { name: 'Ana Pérez' },
    });
    expect(account.authenticationTokens).toHaveLength(2);
    expect(verificationToken?.expiresAt).toEqual(
      new Date('2026-08-31T18:00:00.000Z'),
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
    const tokens = new AuthenticationTokenService();
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
    const originalAccount = await prisma.account.findUniqueOrThrow({
      where: { email: originalEmail },
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
      prisma.account.findUnique({ where: { email: originalEmail } }),
    ).resolves.toBeNull();
    const correctedAccount = await prisma.account.findUniqueOrThrow({
      where: { email: correctedEmail },
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

  it('cancels a pending self-registration and retains only its audit record', async () => {
    const registeredAt = new Date(Date.now() + 120_000);
    const cancelledAt = new Date(registeredAt.getTime() + 60_000);
    const tokens = new AuthenticationTokenService();
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
    const pendingAccount = await prisma.account.findUniqueOrThrow({
      where: { email: registration.email },
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
      prisma.account.findUnique({ where: { id: pendingAccount.id } }),
    ).resolves.toBeNull();
    await expect(
      prisma.client.findUnique({ where: { id: pendingAccount.clientId! } }),
    ).resolves.toBeNull();
    await expect(
      prisma.authenticationToken.count({
        where: { accountId: pendingAccount.id },
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
});

const digestTestEmail = (email: string): Buffer =>
  createHmac('sha256', 'test-email-digest-key').update(email).digest();
