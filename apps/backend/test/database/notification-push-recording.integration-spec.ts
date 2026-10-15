import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PgBoss } from 'pg-boss';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PUSH_DISPATCH_QUEUE } from '../../src/jobs/push-dispatch/push-dispatch-job';
import {
  createNotificationRecorder,
  type NewNotification,
} from '../../src/notifications/prisma-notification-store';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

describe('Recording a notification queues its push (NOT-002)', () => {
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

  const createAccount = async (): Promise<string> => {
    const clientId = randomUUID();
    const accountId = randomUUID();
    await prisma.client.create({
      data: {
        id: clientId,
        name: 'Push Recording Test',
        referralCode: `ref-${clientId}`,
        account: {
          create: { id: accountId, email: `${accountId}@example.com` },
        },
      },
    });
    return accountId;
  };

  const notification = (accountId: string): NewNotification => ({
    accountId,
    category: 'booking_schedule',
    type: 'waitlist_promoted',
    businessEventKey: `waitlist-promoted:${randomUUID()}`,
    title: 'Cupo liberado',
    message: '¡Tienes un cupo!',
    destination: { type: 'booking', id: randomUUID() },
    occurredAt: new Date('2026-09-21T12:00:00.000Z'),
  });

  const dispatchJobsFor = (accountId: string) =>
    context.pool
      .query<{ data: unknown }>(
        `select data from pgboss.job where name = $1 and data->>'accountId' = $2`,
        [PUSH_DISPATCH_QUEUE, accountId],
      )
      .then((result) => result.rows.map((row) => row.data));

  it('queues one dispatch job with only the identifiers', async () => {
    const accountId = await createAccount();
    const recorded = notification(accountId);
    const record = createNotificationRecorder(boss);

    await prisma.$transaction((transaction) => record(transaction, recorded));

    await expect(dispatchJobsFor(accountId)).resolves.toEqual([
      {
        version: 1,
        accountId,
        businessEventKey: recorded.businessEventKey,
      },
    ]);
  });

  it('queues nothing more when the same event is recorded again', async () => {
    const accountId = await createAccount();
    const recorded = notification(accountId);
    const record = createNotificationRecorder(boss);

    await prisma.$transaction((transaction) => record(transaction, recorded));
    await prisma.$transaction((transaction) => record(transaction, recorded));

    await expect(dispatchJobsFor(accountId)).resolves.toHaveLength(1);
  });

  it('queues nothing when the recording transaction rolls back', async () => {
    const accountId = await createAccount();
    const record = createNotificationRecorder(boss);

    await expect(
      prisma.$transaction(async (transaction) => {
        await record(transaction, notification(accountId));
        throw new Error('rolled back');
      }),
    ).rejects.toThrow('rolled back');

    await expect(dispatchJobsFor(accountId)).resolves.toEqual([]);
    await expect(
      prisma.notification.count({ where: { accountId } }),
    ).resolves.toBe(0);
  });
});
