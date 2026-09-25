import type { PgBoss, PrismaTransactionLike } from 'pg-boss';
import { AUTHENTICATION_EMAIL_QUEUE } from './authentication-email-job';
import { scheduleAuthenticationEmail } from './schedule-authentication-email';

jest.mock('pg-boss', () => ({
  fromPrisma: (transaction: PrismaTransactionLike) => ({ transaction }),
}));

const job = {
  version: 1,
  accountId: '0ae2701e-f8ac-4c8a-8cf0-65182ee0fc1d',
  authenticationTokenId: 'b6421a64-1429-4864-830f-e49a67438488',
  purpose: 'verification',
  encryptedLinkSecret: 'ciphertext',
  encryptionKeyId: 'local-test-key',
} as const;

describe('scheduleAuthenticationEmail', () => {
  it('enqueues through the active Prisma transaction', async () => {
    const transaction = { $queryRawUnsafe: jest.fn() };
    const boss = {
      send: jest.fn().mockResolvedValue('job-id'),
    } as unknown as Pick<PgBoss, 'send'>;

    await expect(
      scheduleAuthenticationEmail(boss, transaction, job),
    ).resolves.toBe('job-id');

    expect(boss.send).toHaveBeenCalledWith(
      AUTHENTICATION_EMAIL_QUEUE,
      job,
      expect.objectContaining({
        db: { transaction },
        singletonKey: job.authenticationTokenId,
      }),
    );
  });

  it('fails the transaction when pg-boss does not create a job', async () => {
    const transaction = { $queryRawUnsafe: jest.fn() };
    const boss = {
      send: jest.fn().mockResolvedValue(null),
    } as unknown as Pick<PgBoss, 'send'>;

    await expect(
      scheduleAuthenticationEmail(boss, transaction, job),
    ).rejects.toThrow('pg-boss did not create the authentication email job');
  });

  it('keys the old-address notice apart from the link of the same token (IDN-008)', async () => {
    const transaction = { $queryRawUnsafe: jest.fn() };
    const boss = {
      send: jest.fn().mockResolvedValue('job-id'),
    } as unknown as Pick<PgBoss, 'send'>;

    await scheduleAuthenticationEmail(boss, transaction, {
      ...job,
      purpose: 'email_change_notice',
    });

    expect(boss.send).toHaveBeenCalledWith(
      AUTHENTICATION_EMAIL_QUEUE,
      expect.objectContaining({ purpose: 'email_change_notice' }),
      expect.objectContaining({
        singletonKey: `${job.authenticationTokenId}:notice`,
      }),
    );
  });
});
