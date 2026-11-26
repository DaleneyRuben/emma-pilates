import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import { createNotificationStore } from '../../src/notifications/prisma-notification-store';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const today = new Date('2026-09-21T00:00:00.000Z');
const minute = 60_000;
const day = 24 * 60 * minute;

// Walkthrough n.º 10 (C19c, C19d, E-F15): a notification is removed one at a
// time, can be brought back for a moment with «Deshacer», and one older than
// 30 days leaves the list by itself. Nothing is ever deleted (ADR-0086).
describe('Removing notifications', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let lucia: string;
  let valeria: string;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
    await applyDevelopmentFixtures(prisma, {
      fixtures: buildDevelopmentFixtures({ today }),
      passwordHash: 'not-a-real-hash',
    });
    const idOf = async (email: string) =>
      (
        await prisma.account.findFirstOrThrow({
          where: { email, deletedAt: null },
          select: { id: true },
        })
      ).id;
    lucia = await idOf('lucia@example.com');
    valeria = await idOf('valeria@example.com');
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  const record = async (accountId: string, key: string, occurredAt: Date) => {
    const store = createNotificationStore(prisma);
    await store.record(prisma, {
      accountId,
      category: 'reminder',
      type: 'class_reminder',
      businessEventKey: key,
      title: 'Recordatorio de clase',
      message: key,
      destination: null,
      occurredAt,
    });
    return prisma.notification.findFirstOrThrow({
      where: { accountId, businessEventKey: key },
      select: { id: true },
    });
  };

  it('removes her own notification softly and keeps it out of the list and the count', async () => {
    const store = createNotificationStore(prisma);
    const now = new Date('2026-09-21T12:00:00.000Z');
    const kept = await record(lucia, 'removal:kept', now);
    const removed = await record(lucia, 'removal:removed', now);
    const unreadBefore = await store.countUnread(lucia);

    await expect(
      store.remove({
        notificationId: removed.id,
        accountId: lucia,
        removedAt: now,
      }),
    ).resolves.toBe(1);

    const page = await store.findPage({
      accountId: lucia,
      after: null,
      limit: 50,
    });
    expect(page.map((item) => item.id)).toContain(kept.id);
    expect(page.map((item) => item.id)).not.toContain(removed.id);
    await expect(
      prisma.notification.findUniqueOrThrow({
        where: { id: removed.id },
        select: { deletedAt: true },
      }),
    ).resolves.toEqual({ deletedAt: now });
    await expect(store.countUnread(lucia)).resolves.toBe(unreadBefore - 1);
  });

  it('never removes another Account’s notification', async () => {
    const store = createNotificationStore(prisma);
    const now = new Date('2026-09-21T12:00:00.000Z');
    const hers = await record(valeria, 'removal:valeria', now);

    await expect(
      store.remove({
        notificationId: hers.id,
        accountId: lucia,
        removedAt: now,
      }),
    ).resolves.toBe(0);
  });

  it('brings a notification back only while the undo window is open', async () => {
    const store = createNotificationStore(prisma);
    const now = new Date('2026-09-21T12:00:00.000Z');
    const quick = await record(lucia, 'removal:quick-undo', now);
    const late = await record(lucia, 'removal:late-undo', now);
    await store.remove({
      notificationId: quick.id,
      accountId: lucia,
      removedAt: now,
    });
    await store.remove({
      notificationId: late.id,
      accountId: lucia,
      removedAt: now,
    });

    await expect(
      store.restore({
        notificationId: quick.id,
        accountId: lucia,
        removedSince: new Date(now.getTime() - minute),
      }),
    ).resolves.toBe(1);
    await expect(
      store.restore({
        notificationId: late.id,
        accountId: lucia,
        removedSince: new Date(now.getTime() + minute),
      }),
    ).resolves.toBe(0);

    const page = await store.findPage({
      accountId: lucia,
      after: null,
      limit: 50,
    });
    expect(page.map((item) => item.id)).toContain(quick.id);
    expect(page.map((item) => item.id)).not.toContain(late.id);
  });

  it('leaves out notifications older than the cut-off from the list and the unread count', async () => {
    const store = createNotificationStore(prisma);
    const now = new Date('2026-12-20T12:00:00.000Z');
    const recent = await record(
      lucia,
      'removal:recent',
      new Date(now.getTime() - 29 * day),
    );
    const old = await record(
      lucia,
      'removal:old',
      new Date(now.getTime() - 31 * day),
    );
    const since = new Date(now.getTime() - 30 * day);

    const page = await store.findPage({
      accountId: lucia,
      after: null,
      limit: 50,
      since,
    });

    expect(page.map((item) => item.id)).toContain(recent.id);
    expect(page.map((item) => item.id)).not.toContain(old.id);
    const all = await store.countUnread(lucia);
    await expect(store.countUnread(lucia, since)).resolves.toBeLessThan(all);
  });
});
