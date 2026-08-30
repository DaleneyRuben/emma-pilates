import { createHmac, randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PgBoss } from 'pg-boss';
import {
  AuthenticationThrottleEventKind,
  AuthenticationTokenPurpose,
} from '../../src/generated/prisma/enums';
import { PrismaClient } from '../../src/generated/prisma/client';
import { AUTHENTICATION_EMAIL_QUEUE } from '../../src/jobs/authentication-email/authentication-email-job';
import { PrismaClientRegistrationUnitOfWork } from '../../src/system-identity/registration/prisma-client-registration-unit-of-work';
import { RegisterClient } from '../../src/system-identity/registration/register-client';
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
});
