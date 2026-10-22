import { createHmac, randomUUID } from 'node:crypto';
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
import { CorrectPendingClientEmail } from '../../src/system-identity/registration/correct-pending-client-email';
import { PrismaClientRegistrationUnitOfWork } from '../../src/system-identity/registration/prisma-client-registration-unit-of-work';
import { RegisterClient } from '../../src/system-identity/registration/register-client';
import { ResendPendingClientVerification } from '../../src/system-identity/registration/resend-pending-client-verification';
import { VerifyClientEmail } from '../../src/system-identity/registration/verify-client-email';
import { AuthenticationLinkCipher } from '../../src/system-identity/security/authentication-link-cipher';
import { authenticationTokens } from '../../src/system-identity/security/authentication-token-service';
import {
  digestTestEmail,
  RegistrationWorld,
  startRegistrationWorld,
} from './client-registration-test-support';

describe('Client registration transaction', () => {
  let world: RegistrationWorld;
  let prisma: PrismaClient;
  let boss: PgBoss;

  beforeAll(async () => {
    world = await startRegistrationWorld();
    ({ prisma, boss } = world);
  });

  afterAll(async () => {
    await world?.stop();
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
});
