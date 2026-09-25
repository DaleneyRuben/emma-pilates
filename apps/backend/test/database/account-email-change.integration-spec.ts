import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PgBoss } from 'pg-boss';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { toPrismaBytes } from '../../src/database/prisma-bytes';
import { AUTHENTICATION_EMAIL_QUEUE } from '../../src/jobs/authentication-email/authentication-email-job';
import { PrismaAccountSecurityGateway } from '../../src/system-identity/account-security/prisma-account-security-gateway';
import { createPrismaEmailChangeGateway } from '../../src/system-identity/email-change/prisma-email-change-gateway';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const now = new Date('2026-09-24T15:00:00.000Z');
const later = (minutes: number) => new Date(now.getTime() + minutes * 60_000);
const digestEmail = (email: string) => Buffer.from(`digest:${email}`);

// IDN-008 (proposal E1-E12) on real PostgreSQL: the pending change, its
// email_change token, the recipient throttle, the queued link and notice,
// and the audit records.
describe('account email change (PostgreSQL)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let boss: PgBoss;
  let gateway: ReturnType<typeof createPrismaEmailChangeGateway>;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({
      adapter: createPrismaAdapter(context.databaseUrl),
    });
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
    gateway = createPrismaEmailChangeGateway(prisma, { boss, digestEmail });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  const activeAccount = async (active = true) => {
    const accountId = randomUUID();
    await prisma.client.create({
      data: {
        name: 'Lucía Fernández',
        referralCode: `ref-${accountId.slice(0, 8)}`,
        account: {
          create: {
            id: accountId,
            email: `${accountId}@example.com`,
            passwordHash: 'hash',
            emailVerifiedAt: active ? later(-60) : null,
            activatedAt: active ? later(-60) : null,
            pendingExpiresAt: active ? null : later(60),
          },
        },
      },
    });
    return { accountId, email: `${accountId}@example.com` };
  };

  const link = (secret = randomUUID()) => {
    const id = randomUUID();
    const job = (
      purpose: 'email_change' | 'email_change_notice',
      accountId: string,
    ) => ({
      version: 1 as const,
      accountId,
      authenticationTokenId: id,
      purpose,
      encryptedLinkSecret: 'ciphertext',
      encryptionKeyId: 'local-key',
    });
    return {
      secret,
      digest: Buffer.from(secret),
      token: { id, digest: Buffer.from(secret), expiresAt: later(24 * 60) },
      job,
    };
  };

  const request = (accountId: string, newEmail: string, at = now) => {
    const issued = link();
    return {
      issued,
      outcome: gateway.request({
        accountId,
        newEmail,
        now: at,
        token: issued.token,
        linkJob: issued.job('email_change', accountId),
        noticeJob: issued.job('email_change_notice', accountId),
      }),
    };
  };

  const jobsFor = async (tokenId: string) =>
    (await boss.findJobs(AUTHENTICATION_EMAIL_QUEUE))
      .filter(
        (job) =>
          (job.data as { authenticationTokenId?: string })
            .authenticationTokenId === tokenId,
      )
      .map((job) => (job.data as { purpose: string }).purpose)
      .sort();

  const throttleEvents = (email: string) =>
    prisma.authenticationThrottleEvent.count({
      where: { recipientDigest: toPrismaBytes(digestEmail(email)) },
    });

  const audits = (accountId: string) =>
    prisma.auditRecord.findMany({
      where: { targetType: 'account', targetId: accountId },
      orderBy: { occurredAt: 'asc' },
    });

  it('stores the pending change, its token, the throttle event, both emails, and the audit for a free address', async () => {
    const { accountId } = await activeAccount();
    const newEmail = `${randomUUID()}@example.com`;
    const { issued, outcome } = request(accountId, newEmail);

    await expect(outcome).resolves.toBe('requested');

    const token = await prisma.authenticationToken.findUniqueOrThrow({
      where: { id: issued.token.id },
    });
    expect(token.purpose).toBe('EMAIL_CHANGE');
    expect(token.expiresAt).toEqual(later(24 * 60));
    await expect(
      prisma.accountEmailChange.findUniqueOrThrow({ where: { accountId } }),
    ).resolves.toMatchObject({
      newEmail,
      authenticationTokenId: issued.token.id,
      requestedAt: now,
      expiresAt: later(24 * 60),
    });
    await expect(throttleEvents(newEmail)).resolves.toBe(1);
    await expect(jobsFor(issued.token.id)).resolves.toEqual([
      'email_change',
      'email_change_notice',
    ]);
    expect((await audits(accountId)).map((a) => a.actionCode)).toEqual([
      'account.email_change_requested',
    ]);
    await expect(gateway.readPending({ accountId, now })).resolves.toEqual({
      email: newEmail,
      requestedAt: now,
      expiresAt: later(24 * 60),
    });
  });

  it('refuses the current address and a pending Account without writing anything', async () => {
    const { accountId, email } = await activeAccount();
    await expect(request(accountId, email).outcome).resolves.toBe('unchanged');
    const pending = await activeAccount(false);
    await expect(
      request(pending.accountId, `${randomUUID()}@example.com`).outcome,
    ).resolves.toBe('not_active');
    await expect(prisma.accountEmailChange.count()).resolves.toBe(
      await prisma.accountEmailChange.count(),
    );
    expect(await audits(accountId)).toEqual([]);
    expect(await audits(pending.accountId)).toEqual([]);
  });

  it('answers neutrally for an address another Account uses: the change is stored but no email or throttle event', async () => {
    const { accountId } = await activeAccount();
    const other = await activeAccount();
    const { issued, outcome } = request(accountId, other.email);

    await expect(outcome).resolves.toBe('requested');
    await expect(
      prisma.accountEmailChange.findUniqueOrThrow({ where: { accountId } }),
    ).resolves.toMatchObject({ newEmail: other.email });
    await expect(jobsFor(issued.token.id)).resolves.toEqual([]);
    await expect(throttleEvents(other.email)).resolves.toBe(0);
    await expect(
      gateway.readPending({ accountId, now }),
    ).resolves.toMatchObject({ email: other.email });
  });

  it('replaces a pending change with the next request and invalidates the previous link', async () => {
    const { accountId } = await activeAccount();
    const first = request(accountId, `${randomUUID()}@example.com`);
    await first.outcome;
    const secondEmail = `${randomUUID()}@example.com`;
    const second = request(accountId, secondEmail, later(5));
    await expect(second.outcome).resolves.toBe('requested');

    const previous = await prisma.authenticationToken.findUniqueOrThrow({
      where: { id: first.issued.token.id },
    });
    expect(previous.invalidatedAt).toEqual(later(5));
    await expect(
      gateway.readPending({ accountId, now: later(5) }),
    ).resolves.toMatchObject({ email: secondEmail, requestedAt: later(5) });
  });

  it('resends a fresh link, suppresses it once the recipient lane is full, and reports nothing pending', async () => {
    const { accountId } = await activeAccount();
    const newEmail = `${randomUUID()}@example.com`;
    const first = request(accountId, newEmail);
    await first.outcome;

    const resent = link();
    await expect(
      gateway.resend({
        accountId,
        now: later(2),
        token: resent.token,
        linkJob: resent.job('email_change', accountId),
      }),
    ).resolves.toBe('sent');
    expect(
      (
        await prisma.authenticationToken.findUniqueOrThrow({
          where: { id: first.issued.token.id },
        })
      ).invalidatedAt,
    ).toEqual(later(2));
    await expect(jobsFor(resent.token.id)).resolves.toEqual(['email_change']);
    await expect(throttleEvents(newEmail)).resolves.toBe(2);

    // Within 60 seconds of the last email the lane is closed (ADR-0029).
    const suppressed = link();
    await expect(
      gateway.resend({
        accountId,
        now: later(2.5),
        token: suppressed.token,
        linkJob: suppressed.job('email_change', accountId),
      }),
    ).resolves.toBe('suppressed');
    await expect(
      prisma.authenticationToken.findUnique({
        where: { id: suppressed.token.id },
      }),
    ).resolves.toBeNull();
    await expect(
      gateway.readPending({ accountId, now: later(3) }),
    ).resolves.toMatchObject({ email: newEmail });

    const nothing = await activeAccount();
    const none = link();
    await expect(
      gateway.resend({
        accountId: nothing.accountId,
        now,
        token: none.token,
        linkJob: none.job('email_change', nothing.accountId),
      }),
    ).resolves.toBe('none');
  });

  it('cancels the pending change, invalidating its link, and is idempotent', async () => {
    const { accountId } = await activeAccount();
    const { issued } = request(accountId, `${randomUUID()}@example.com`);
    await new Promise((resolve) => setTimeout(resolve, 10));

    await expect(gateway.cancel({ accountId, now: later(1) })).resolves.toBe(
      'cancelled',
    );
    await expect(gateway.cancel({ accountId, now: later(1) })).resolves.toBe(
      'none',
    );
    await expect(
      prisma.accountEmailChange.findUnique({ where: { accountId } }),
    ).resolves.toBeNull();
    expect(
      (
        await prisma.authenticationToken.findUniqueOrThrow({
          where: { id: issued.token.id },
        })
      ).invalidatedAt,
    ).toEqual(later(1));
    await expect(
      gateway.readPending({ accountId, now: later(1) }),
    ).resolves.toBeNull();
    expect((await audits(accountId)).map((a) => a.actionCode)).toEqual([
      'account.email_change_requested',
      'account.email_change_cancelled',
    ]);
  });

  it('completes the change from the link: new email verified, token used, row gone, audited', async () => {
    const { accountId, email } = await activeAccount();
    const newEmail = `${randomUUID()}@example.com`;
    const { issued } = request(accountId, newEmail);
    await new Promise((resolve) => setTimeout(resolve, 10));

    await expect(
      gateway.complete({ tokenDigest: issued.digest, now: later(30) }),
    ).resolves.toBe('changed');

    const account = await prisma.account.findUniqueOrThrow({
      where: { id: accountId },
    });
    expect(account.email).toBe(newEmail);
    expect(account.emailVerifiedAt).toEqual(later(30));
    expect(account.activatedAt).not.toBeNull();
    expect(
      (
        await prisma.authenticationToken.findUniqueOrThrow({
          where: { id: issued.token.id },
        })
      ).usedAt,
    ).toEqual(later(30));
    await expect(
      prisma.accountEmailChange.findUnique({ where: { accountId } }),
    ).resolves.toBeNull();
    expect(await audits(accountId)).toMatchObject([
      { actionCode: 'account.email_change_requested' },
      {
        actionCode: 'account.email_changed',
        actorKind: 'ACCOUNT',
        actorAccountId: accountId,
        metadata: { previousEmail: email },
      },
    ]);

    await expect(
      gateway.complete({ tokenDigest: issued.digest, now: later(31) }),
    ).resolves.toBe('expired');
    await expect(
      gateway.complete({ tokenDigest: Buffer.from('unknown'), now }),
    ).resolves.toBe('invalid');
  });

  it('refuses to complete once the link expired or the address was taken meanwhile', async () => {
    const { accountId } = await activeAccount();
    const newEmail = `${randomUUID()}@example.com`;
    const { issued } = request(accountId, newEmail);
    await new Promise((resolve) => setTimeout(resolve, 10));
    await expect(
      gateway.readPending({ accountId, now: later(25 * 60) }),
    ).resolves.toBeNull();
    await expect(
      gateway.complete({ tokenDigest: issued.digest, now: later(25 * 60) }),
    ).resolves.toBe('expired');

    const raced = await activeAccount();
    const racedEmail = `${randomUUID()}@example.com`;
    const racedLink = request(raced.accountId, racedEmail);
    await racedLink.outcome;
    await prisma.account.update({
      where: { id: (await activeAccount()).accountId },
      data: { email: racedEmail },
    });
    await expect(
      gateway.complete({ tokenDigest: racedLink.issued.digest, now: later(1) }),
    ).resolves.toBe('email_unavailable');
    expect(
      (
        await prisma.account.findUniqueOrThrow({
          where: { id: raced.accountId },
        })
      ).email,
    ).toBe(raced.email);
  });

  it('is cancelled by a password change (E11)', async () => {
    const { accountId } = await activeAccount();
    const { issued } = request(accountId, `${randomUUID()}@example.com`);
    await new Promise((resolve) => setTimeout(resolve, 10));
    const security = new PrismaAccountSecurityGateway(prisma);

    await security.completePasswordChange({
      accountId,
      authenticationSessionId: randomUUID(),
      passwordHash: 'new-hash',
      changedAt: later(1),
      auditRecordId: randomUUID(),
    });

    await expect(
      gateway.readPending({ accountId, now: later(2) }),
    ).resolves.toBeNull();
    await expect(
      gateway.complete({ tokenDigest: issued.digest, now: later(2) }),
    ).resolves.toBe('expired');
  });
});
