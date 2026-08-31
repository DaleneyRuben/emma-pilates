import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaAccountSecurityGateway } from '../../src/system-identity/account-security/prisma-account-security-gateway';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

describe('Account security persistence', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('consumes an activation link and activates the pending Account', async () => {
    const completedAt = new Date('2026-08-31T18:00:00.000Z');
    const accountId = await createClientAccount(prisma, false);
    const tokenDigest = Buffer.from(randomUUID());
    const token = await prisma.authenticationToken.create({
      data: {
        accountId,
        purpose: 'ACTIVATION',
        tokenDigest,
        expiresAt: new Date('2026-09-01T18:00:00.000Z'),
      },
    });
    const gateway = new PrismaAccountSecurityGateway(prisma);

    await gateway.activateAccount({
      tokenDigest,
      passwordHash: 'argon2id-password-hash',
      completedAt,
    });

    await expect(
      prisma.account.findUniqueOrThrow({ where: { id: accountId } }),
    ).resolves.toMatchObject({
      passwordHash: 'argon2id-password-hash',
      passwordChangedAt: completedAt,
      emailVerifiedAt: completedAt,
      activatedAt: completedAt,
      pendingExpiresAt: null,
    });
    await expect(
      prisma.authenticationToken.findUniqueOrThrow({
        where: { id: token.id },
      }),
    ).resolves.toMatchObject({ usedAt: completedAt });
    await expect(
      prisma.authenticationSession.count({ where: { accountId } }),
    ).resolves.toBe(0);
  });

  it('recovers a password while revoking old sessions and creating one replacement', async () => {
    const completedAt = new Date('2026-08-31T18:00:00.000Z');
    const accountId = await createClientAccount(prisma, true);
    const tokenDigest = Buffer.from(randomUUID());
    await prisma.authenticationToken.create({
      data: {
        accountId,
        purpose: 'PASSWORD_RECOVERY',
        tokenDigest,
        expiresAt: new Date('2026-08-31T18:30:00.000Z'),
      },
    });
    const oldSessionId = await createSession(prisma, accountId, 'old');
    const replacementSessionId = randomUUID();
    const gateway = new PrismaAccountSecurityGateway(prisma);

    await gateway.completeRecovery({
      tokenDigest,
      passwordHash: 'recovered-password-hash',
      completedAt,
      authenticationSession: {
        id: replacementSessionId,
        surface: 'mobile',
        credentialDigest: Buffer.from(randomUUID()),
        createdAt: completedAt,
        lastMeaningfulActivityAt: completedAt,
        idleExpiresAt: new Date('2026-09-30T18:00:00.000Z'),
        absoluteExpiresAt: new Date('2026-11-29T18:00:00.000Z'),
      },
      auditRecordId: randomUUID(),
    });

    await expect(
      prisma.authenticationSession.findUniqueOrThrow({
        where: { id: oldSessionId },
      }),
    ).resolves.toMatchObject({
      revokedAt: completedAt,
      revocationReason: 'PASSWORD_RECOVERED',
    });
    await expect(
      prisma.authenticationSession.findUniqueOrThrow({
        where: { id: replacementSessionId },
      }),
    ).resolves.toMatchObject({ accountId, revokedAt: null });
    await expect(
      prisma.auditRecord.findFirstOrThrow({
        where: {
          targetId: accountId,
          actionCode: 'account.password_recovered',
        },
      }),
    ).resolves.toMatchObject({ outcome: 'SUCCEEDED' });
  });

  it('changes a password while keeping only the authorizing session active', async () => {
    const changedAt = new Date('2026-08-31T18:00:00.000Z');
    const accountId = await createClientAccount(prisma, true);
    const currentSessionId = await createSession(prisma, accountId, 'current');
    const otherSessionId = await createSession(prisma, accountId, 'other');
    const gateway = new PrismaAccountSecurityGateway(prisma);

    await gateway.completePasswordChange({
      accountId,
      authenticationSessionId: currentSessionId,
      passwordHash: 'changed-password-hash',
      changedAt,
      auditRecordId: randomUUID(),
    });

    await expect(
      prisma.authenticationSession.findUniqueOrThrow({
        where: { id: currentSessionId },
      }),
    ).resolves.toMatchObject({ revokedAt: null });
    await expect(
      prisma.authenticationSession.findUniqueOrThrow({
        where: { id: otherSessionId },
      }),
    ).resolves.toMatchObject({
      revokedAt: changedAt,
      revocationReason: 'PASSWORD_CHANGED',
    });
  });
});

const createClientAccount = async (
  prisma: PrismaClient,
  active: boolean,
): Promise<string> => {
  const accountId = randomUUID();
  const activatedAt = active ? new Date('2026-08-30T18:00:00.000Z') : null;

  await prisma.client.create({
    data: {
      id: randomUUID(),
      name: 'Account Security Client',
      referralCode: `ref-${accountId}`,
      account: {
        create: {
          id: accountId,
          email: `${accountId}@example.com`,
          passwordHash: active ? 'current-password-hash' : null,
          emailVerifiedAt: activatedAt,
          activatedAt,
          pendingExpiresAt: active
            ? null
            : new Date('2026-09-30T18:00:00.000Z'),
        },
      },
    },
  });

  return accountId;
};

const createSession = async (
  prisma: PrismaClient,
  accountId: string,
  label: string,
): Promise<string> => {
  const id = randomUUID();
  await prisma.authenticationSession.create({
    data: {
      id,
      accountId,
      surface: 'MOBILE',
      credentialDigest: Buffer.from(`${label}-${randomUUID()}`),
      createdAt: new Date('2026-08-30T18:00:00.000Z'),
      lastMeaningfulActivityAt: new Date('2026-08-30T18:00:00.000Z'),
      idleExpiresAt: new Date('2026-09-30T18:00:00.000Z'),
      absoluteExpiresAt: new Date('2026-11-29T18:00:00.000Z'),
    },
  });

  return id;
};
