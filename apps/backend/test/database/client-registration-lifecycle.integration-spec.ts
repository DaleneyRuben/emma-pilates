import { createHmac, randomUUID } from 'node:crypto';
import { PgBoss } from 'pg-boss';
import { PrismaClient } from '../../src/generated/prisma/client';
import { CancelPendingClientRegistration } from '../../src/system-identity/registration/cancel-pending-client-registration';
import { CleanupExpiredPendingAccounts } from '../../src/system-identity/registration/cleanup-expired-pending-accounts';
import { PrismaClientRegistrationUnitOfWork } from '../../src/system-identity/registration/prisma-client-registration-unit-of-work';
import { RegisterClient } from '../../src/system-identity/registration/register-client';
import { AuthenticationLinkCipher } from '../../src/system-identity/security/authentication-link-cipher';
import { authenticationTokens } from '../../src/system-identity/security/authentication-token-service';
import { attributeReferral } from '../../src/booking/payments/referral-attribution';
import {
  digestTestEmail,
  RegistrationWorld,
  startRegistrationWorld,
} from './client-registration-test-support';

describe('Client registration cancellation, cleanup, and referral', () => {
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

  it('refuses the referral code of a removed Client', async () => {
    const removed = await prisma.client.create({
      data: {
        name: 'Retirada Prueba',
        referralCode: `REF-GONE-${randomUUID().slice(0, 6).toUpperCase()}`,
        deletedAt: new Date(),
      },
      select: { referralCode: true },
    });

    await expect(
      prisma.$transaction((transaction) =>
        attributeReferral(transaction, {
          referredClientId: randomUUID(),
          referralCode: removed.referralCode,
        }),
      ),
    ).rejects.toMatchObject({ code: 'referral_code_invalid' });
  });
});
