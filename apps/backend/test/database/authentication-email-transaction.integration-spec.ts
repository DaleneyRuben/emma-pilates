import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PgBoss } from 'pg-boss';
import { AuthenticationTokenPurpose } from '../../src/generated/prisma/enums';
import { PrismaClient } from '../../src/generated/prisma/client';
import { AUTHENTICATION_EMAIL_QUEUE } from '../../src/jobs/authentication-email/authentication-email-job';
import { scheduleAuthenticationEmail } from '../../src/jobs/authentication-email/schedule-authentication-email';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

describe('authentication email transaction', () => {
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

  it('commits an authentication token and its email job together', async () => {
    const accountId = await createAccount(prisma);
    const authenticationTokenId = randomUUID();

    const jobId = await prisma.$transaction(async (transaction) => {
      await transaction.authenticationToken.create({
        data: {
          id: authenticationTokenId,
          accountId,
          purpose: AuthenticationTokenPurpose.VERIFICATION,
          tokenDigest: Buffer.from(randomUUID()),
          expiresAt: new Date(Date.now() + 60_000),
        },
      });

      return scheduleAuthenticationEmail(boss, transaction, {
        version: 1,
        accountId,
        authenticationTokenId,
        purpose: 'verification',
        encryptedLinkSecret: 'ciphertext',
        encryptionKeyId: 'local-test-key',
      });
    });

    await expect(
      prisma.authenticationToken.findUnique({
        where: { id: authenticationTokenId },
      }),
    ).resolves.not.toBeNull();
    await expect(
      boss.findJobs(AUTHENTICATION_EMAIL_QUEUE, { id: jobId }),
    ).resolves.toHaveLength(1);
  });

  it('rolls back both when the transaction fails', async () => {
    const accountId = await createAccount(prisma);
    const authenticationTokenId = randomUUID();
    let jobId: string | undefined;

    await expect(
      prisma.$transaction(async (transaction) => {
        await transaction.authenticationToken.create({
          data: {
            id: authenticationTokenId,
            accountId,
            purpose: AuthenticationTokenPurpose.VERIFICATION,
            tokenDigest: Buffer.from(randomUUID()),
            expiresAt: new Date(Date.now() + 60_000),
          },
        });

        jobId = await scheduleAuthenticationEmail(boss, transaction, {
          version: 1,
          accountId,
          authenticationTokenId,
          purpose: 'verification',
          encryptedLinkSecret: 'ciphertext',
          encryptionKeyId: 'local-test-key',
        });

        throw new Error('force rollback');
      }),
    ).rejects.toThrow('force rollback');

    expect(jobId).toBeDefined();
    await expect(
      prisma.authenticationToken.findUnique({
        where: { id: authenticationTokenId },
      }),
    ).resolves.toBeNull();
    await expect(
      boss.findJobs(AUTHENTICATION_EMAIL_QUEUE, { id: jobId }),
    ).resolves.toHaveLength(0);
  });
});

const createAccount = async (prisma: PrismaClient): Promise<string> => {
  const clientId = randomUUID();
  const accountId = randomUUID();

  await prisma.client.create({
    data: {
      id: clientId,
      name: 'Email Transaction Test',
      referralCode: `ref-${clientId}`,
      account: {
        create: {
          id: accountId,
          email: `${accountId}@example.com`,
        },
      },
    },
  });

  return accountId;
};
