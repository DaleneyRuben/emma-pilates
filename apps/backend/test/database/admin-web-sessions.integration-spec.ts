import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaAccountSecurityGateway } from '../../src/system-identity/account-security/prisma-account-security-gateway';
import { newAuthenticationSession } from '../../src/system-identity/authentication/create-authentication-session';
import { PrismaAuthenticationGateway } from '../../src/system-identity/authentication/prisma-authentication-gateway';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

describe('admin-web Authentication Session persistence', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  const now = new Date('2026-08-31T18:00:00.000Z');

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('reads the Staff Role at Login and stores and resolves the browser surface', async () => {
    const accountId = await createAccount(prisma, 'ADMINISTRATOR');
    const gateway = new PrismaAuthenticationGateway(prisma);
    const credentialDigest = Buffer.from(randomUUID());

    await expect(
      gateway.findAccountByEmail(`${accountId}@example.com`),
    ).resolves.toMatchObject({ id: accountId, staffRole: 'ADMINISTRATOR' });
    await gateway.completeLogin({
      loginLaneDigest: Buffer.from(randomUUID()),
      session: newAuthenticationSession(
        { id: randomUUID(), accountId, surface: 'admin_web', credentialDigest },
        now,
      ),
    });

    await expect(
      gateway.findSessionByCredentialDigest(credentialDigest),
    ).resolves.toMatchObject({
      accountId,
      surface: 'admin_web',
      idleExpiresAt: new Date('2026-08-31T18:30:00.000Z'),
      absoluteExpiresAt: new Date('2026-09-01T06:00:00.000Z'),
    });
  });

  it.each(['ADMINISTRATOR', 'COORDINATOR'] as const)(
    'opens the replacement browser session when a %s recovers the password',
    async (role) => {
      const accountId = await createAccount(prisma, role);
      const tokenDigest = await createRecoveryToken(prisma, accountId);
      const oldSessionId = await createMobileSession(prisma, accountId);
      const replacement = newAuthenticationSession(
        {
          id: randomUUID(),
          accountId,
          surface: 'admin_web',
          credentialDigest: Buffer.from(randomUUID()),
        },
        now,
      );

      await expect(
        new PrismaAccountSecurityGateway(prisma).completeRecovery({
          tokenDigest,
          passwordHash: 'recovered-password-hash',
          completedAt: now,
          authenticationSession: replacement,
          sessionEligibility: 'admin_web',
          auditRecordId: randomUUID(),
        }),
      ).resolves.toEqual({ sessionOpened: true });
      await expect(
        prisma.authenticationSession.findUniqueOrThrow({
          where: { id: replacement.id },
        }),
      ).resolves.toMatchObject({ surface: 'ADMIN_WEB', revokedAt: null });
      await expect(
        prisma.authenticationSession.findUniqueOrThrow({
          where: { id: oldSessionId },
        }),
      ).resolves.toMatchObject({ revocationReason: 'PASSWORD_RECOVERED' });
    },
  );

  it('replaces the password and revokes every session but opens no browser session for a Client', async () => {
    const accountId = await createAccount(prisma, null);
    const tokenDigest = await createRecoveryToken(prisma, accountId);
    const oldSessionId = await createMobileSession(prisma, accountId);
    const replacement = newAuthenticationSession(
      {
        id: randomUUID(),
        accountId,
        surface: 'admin_web',
        credentialDigest: Buffer.from(randomUUID()),
      },
      now,
    );

    await expect(
      new PrismaAccountSecurityGateway(prisma).completeRecovery({
        tokenDigest,
        passwordHash: 'recovered-password-hash',
        completedAt: now,
        authenticationSession: replacement,
        sessionEligibility: 'admin_web',
        auditRecordId: randomUUID(),
      }),
    ).resolves.toEqual({ sessionOpened: false });
    await expect(
      prisma.authenticationSession.findUnique({
        where: { id: replacement.id },
      }),
    ).resolves.toBeNull();
    await expect(
      prisma.authenticationSession.findUniqueOrThrow({
        where: { id: oldSessionId },
      }),
    ).resolves.toMatchObject({ revocationReason: 'PASSWORD_RECOVERED' });
    await expect(
      prisma.account.findUniqueOrThrow({ where: { id: accountId } }),
    ).resolves.toMatchObject({ passwordHash: 'recovered-password-hash' });
  });
});

const createAccount = async (
  prisma: PrismaClient,
  staffRole: 'ADMINISTRATOR' | 'COORDINATOR' | null,
): Promise<string> => {
  const accountId = randomUUID();
  const activatedAt = new Date('2026-08-30T18:00:00.000Z');
  const account = {
    id: accountId,
    email: `${accountId}@example.com`,
    passwordHash: 'current-password-hash',
    emailVerifiedAt: activatedAt,
    activatedAt,
  };

  if (staffRole === null) {
    await prisma.client.create({
      data: {
        id: randomUUID(),
        name: 'Browser Recovery Client',
        referralCode: `ref-${accountId}`,
        account: { create: account },
      },
    });
  } else {
    await prisma.staffMember.create({
      data: {
        id: randomUUID(),
        name: 'Browser Administrator',
        role: staffRole,
        account: { create: account },
      },
    });
  }

  return accountId;
};

const createRecoveryToken = async (
  prisma: PrismaClient,
  accountId: string,
): Promise<Buffer> => {
  const tokenDigest = Buffer.from(randomUUID());
  await prisma.authenticationToken.create({
    data: {
      accountId,
      purpose: 'PASSWORD_RECOVERY',
      tokenDigest,
      issuedAt: new Date('2026-08-31T17:45:00.000Z'),
      expiresAt: new Date('2026-08-31T18:15:00.000Z'),
    },
  });
  return tokenDigest;
};

const createMobileSession = async (
  prisma: PrismaClient,
  accountId: string,
): Promise<string> => {
  const id = randomUUID();
  await prisma.authenticationSession.create({
    data: {
      id,
      accountId,
      surface: 'MOBILE',
      credentialDigest: Buffer.from(randomUUID()),
      createdAt: new Date('2026-08-30T18:00:00.000Z'),
      lastMeaningfulActivityAt: new Date('2026-08-30T18:00:00.000Z'),
      idleExpiresAt: new Date('2026-09-30T18:00:00.000Z'),
      absoluteExpiresAt: new Date('2026-11-29T18:00:00.000Z'),
    },
  });
  return id;
};
