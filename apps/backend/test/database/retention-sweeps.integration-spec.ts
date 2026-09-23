import { randomBytes, randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaRetentionSweeps } from '../../src/system-identity/retention/prisma-retention-sweeps';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const hour = 60 * 60 * 1_000;
const day = 24 * hour;
const now = new Date('2026-09-23T12:00:00.000Z');
const ago = (milliseconds: number) => new Date(now.getTime() - milliseconds);

describe('Prisma retention sweeps', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let accountId: string;

  const idempotency = (label: string, createdAt: Date, expiresAt: Date) =>
    prisma.idempotencyRecord.create({
      data: {
        id: randomUUID(),
        accountId,
        command: label,
        idempotencyKey: randomUUID(),
        requestHash: randomBytes(32),
        responseStatus: 201,
        createdAt,
        expiresAt,
      },
    });

  const session = (
    label: string,
    times: {
      createdAt: Date;
      idleExpiresAt: Date;
      absoluteExpiresAt: Date;
      revokedAt?: Date;
    },
  ) =>
    prisma.authenticationSession
      .create({
        data: {
          id: randomUUID(),
          accountId,
          surface: 'MOBILE',
          credentialDigest: randomBytes(32),
          createdAt: times.createdAt,
          lastMeaningfulActivityAt: times.createdAt,
          idleExpiresAt: times.idleExpiresAt,
          absoluteExpiresAt: times.absoluteExpiresAt,
          revokedAt: times.revokedAt,
          revocationReason:
            times.revokedAt === undefined ? undefined : 'LOGOUT',
        },
        select: { id: true },
      })
      .then(({ id }) => ({ label, id }));

  const throttle = (expiresAt: Date) =>
    prisma.authenticationThrottleEvent.create({
      data: {
        purpose: 'ACTIVATION',
        eventKind: 'MESSAGE_ISSUED',
        recipientDigest: randomBytes(32),
        occurredAt: new Date(expiresAt.getTime() - day),
        expiresAt,
      },
      select: { id: true },
    });

  const notification = (key: string, createdAt: Date, readAt: Date | null) =>
    prisma.notification.create({
      data: {
        accountId,
        category: 'BOOKING_SCHEDULE',
        type: 'session_cancelled',
        businessEventKey: key,
        title: 'Aviso',
        message: 'Aviso de prueba',
        createdAt,
        readAt,
      },
      select: { id: true },
    });

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
    accountId = randomUUID();
    await prisma.client.create({
      data: {
        id: randomUUID(),
        name: 'Retention Client',
        referralCode: `ref-${accountId}`,
        account: {
          create: {
            id: accountId,
            email: `${accountId}@example.com`,
            passwordHash: 'hash',
            emailVerifiedAt: ago(400 * day),
            activatedAt: ago(400 * day),
          },
        },
      },
    });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('deletes only rows past their provisional window, in batches, and never audit records', async () => {
    await idempotency('old-expired', ago(49 * hour), ago(hour));
    const young = await idempotency('young-expired', ago(47 * hour), ago(hour));
    const unexpired = await idempotency(
      'old-unexpired',
      ago(72 * hour),
      new Date(now.getTime() + hour),
    );

    const created = ago(200 * day);
    const sessions = await Promise.all([
      session('revoked-long-ago', {
        createdAt: created,
        idleExpiresAt: ago(20 * day),
        absoluteExpiresAt: ago(10 * day),
        revokedAt: ago(91 * day),
      }),
      session('revoked-recently', {
        createdAt: ago(100 * day),
        idleExpiresAt: new Date(now.getTime() + day),
        absoluteExpiresAt: new Date(now.getTime() + 2 * day),
        revokedAt: ago(89 * day),
      }),
      session('idle-long-ago', {
        createdAt: created,
        idleExpiresAt: ago(91 * day),
        absoluteExpiresAt: ago(20 * day),
      }),
      session('absolute-long-ago', {
        createdAt: created,
        idleExpiresAt: ago(92 * day),
        absoluteExpiresAt: ago(91 * day),
      }),
      session('idle-recently', {
        createdAt: created,
        idleExpiresAt: ago(89 * day),
        absoluteExpiresAt: new Date(now.getTime() + day),
      }),
      session('active', {
        createdAt: ago(day),
        idleExpiresAt: new Date(now.getTime() + 29 * day),
        absoluteExpiresAt: new Date(now.getTime() + 89 * day),
      }),
    ]);

    const oldThrottle = await throttle(ago(31 * day));
    const recentThrottle = await throttle(ago(29 * day));

    const readLongAgo = await notification(
      'read-long-ago',
      ago(200 * day),
      ago(181 * day),
    );
    const readRecently = await notification(
      'read-recently',
      ago(200 * day),
      ago(179 * day),
    );
    const unreadOld = await notification('unread-old', ago(400 * day), null);

    await prisma.auditRecord.create({
      data: {
        actionCode: 'account.activated',
        outcome: 'SUCCEEDED',
        actorKind: 'ACCOUNT',
        actorAccountId: accountId,
        targetType: 'account',
        targetId: accountId,
        correlationId: randomUUID(),
        occurredAt: ago(1_000 * day),
      },
    });

    const result = await createPrismaRetentionSweeps(prisma, {
      now: () => now,
      batchSize: 1,
    }).execute();

    expect(result).toEqual({
      idempotencyRecords: 1,
      authenticationSessions: 3,
      throttleEvents: 1,
      notifications: 1,
    });
    await expect(
      prisma.idempotencyRecord.findMany({
        select: { id: true },
        orderBy: { command: 'asc' },
      }),
    ).resolves.toEqual([{ id: unexpired.id }, { id: young.id }]);
    const kept = await prisma.authenticationSession.findMany({
      select: { id: true },
    });
    expect(
      kept.map(({ id }) => sessions.find((s) => s.id === id)?.label).sort(),
    ).toEqual(['active', 'idle-recently', 'revoked-recently']);
    await expect(
      prisma.authenticationThrottleEvent.findMany({ select: { id: true } }),
    ).resolves.toEqual([{ id: recentThrottle.id }]);
    expect(oldThrottle.id).not.toBe(recentThrottle.id);
    const notifications = await prisma.notification.findMany({
      select: { id: true },
    });
    expect(notifications.map(({ id }) => id).sort()).toEqual(
      [readRecently.id, unreadOld.id].sort(),
    );
    expect(notifications.map(({ id }) => id)).not.toContain(readLongAgo.id);
    await expect(prisma.auditRecord.count()).resolves.toBe(1);

    await expect(
      createPrismaRetentionSweeps(prisma, {
        now: () => now,
        batchSize: 1,
      }).execute(),
    ).resolves.toEqual({
      idempotencyRecords: 0,
      authenticationSessions: 0,
      throttleEvents: 0,
      notifications: 0,
    });
  });
});
