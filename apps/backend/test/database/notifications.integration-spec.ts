import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaBookingCommands } from '../../src/booking/commands/prisma-booking-commands';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import { createNotificationStore } from '../../src/notifications/prisma-notification-store';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const today = new Date('2026-09-21T00:00:00.000Z');

describe('Notification store', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let accountId: string;
  const fixtures = buildDevelopmentFixtures({ today });

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
    await applyDevelopmentFixtures(prisma, {
      fixtures,
      passwordHash: 'not-a-real-hash',
    });
    accountId = (
      await prisma.account.findUniqueOrThrow({
        where: { email: 'lucia@example.com' },
        select: { id: true },
      })
    ).id;
    await prisma.notification.deleteMany({ where: { accountId } });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('records a notification once per business event and lists newest first with unread count', async () => {
    const store = createNotificationStore(prisma);
    const base = {
      accountId,
      category: 'booking_schedule' as const,
      type: 'waitlist_promoted',
      title: 'Cupo liberado',
      message: '¡Tienes un cupo!',
      destination: {
        type: 'booking',
        id: '11111111-1111-4111-8111-111111111111',
      },
    };

    await store.record(prisma, {
      ...base,
      businessEventKey: 'waitlist-promoted:entry-1',
      occurredAt: new Date('2026-09-21T10:00:00.000Z'),
    });
    await store.record(prisma, {
      ...base,
      businessEventKey: 'waitlist-promoted:entry-1',
      occurredAt: new Date('2026-09-21T10:05:00.000Z'),
    });
    await store.record(prisma, {
      ...base,
      businessEventKey: 'waitlist-promoted:entry-2',
      message: 'Segundo aviso',
      occurredAt: new Date('2026-09-21T11:00:00.000Z'),
    });

    const page = await store.findPage({ accountId, after: null, limit: 10 });

    expect(page.map((item) => item.message)).toEqual([
      'Segundo aviso',
      '¡Tienes un cupo!',
    ]);
    expect(page[0]).toMatchObject({
      category: 'booking_schedule',
      type: 'waitlist_promoted',
      destinationType: 'booking',
      destinationId: '11111111-1111-4111-8111-111111111111',
      readAt: null,
    });
    await expect(store.countUnread(accountId)).resolves.toBe(2);
  });

  it('notifies a promoted Waitlist Client inside the booking transaction', async () => {
    const valeria = fixtures.clients.find(
      (c) => c.email === 'valeria@example.com',
    )!;
    const valeriaAccount = await prisma.account.findUniqueOrThrow({
      where: { email: valeria.email },
      select: { id: true },
    });
    const luciaAccount = await prisma.account.findUniqueOrThrow({
      where: { email: 'lucia@example.com' },
      select: { id: true },
    });
    const now = new Date('2026-09-21T12:00:00.000Z');
    const session = fixtures.sessions
      .filter((s) => s.startsAt > new Date('2026-09-22T12:00:00.000Z'))
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];
    await prisma.waitlistEntry.deleteMany({ where: { sessionId: session.id } });
    await prisma.booking.deleteMany({ where: { sessionId: session.id } });
    await prisma.notification.deleteMany({
      where: { accountId: valeriaAccount.id },
    });
    await prisma.session.update({
      where: { id: session.id },
      data: { capacity: 1 },
    });
    const commands = new PrismaBookingCommands(prisma, () => now);
    const luciaPrincipal = {
      accountId: luciaAccount.id,
      authenticationSessionId: randomUUID(),
      identity: { kind: 'client' as const, clientId: fixtures.clients[0].id },
    };
    const booking = await commands.create(
      { sessionId: session.id },
      luciaPrincipal,
    );
    await commands.joinWaitlist(
      { sessionId: session.id },
      {
        accountId: valeriaAccount.id,
        authenticationSessionId: randomUUID(),
        identity: { kind: 'client', clientId: valeria.id },
      },
    );

    await commands.cancel({ bookingId: booking.id }, luciaPrincipal);

    const store = createNotificationStore(prisma);
    const [notification] = await store.findPage({
      accountId: valeriaAccount.id,
      after: null,
      limit: 5,
    });
    const className = fixtures.classTypes.find(
      (classType) => classType.id === session.classTypeId,
    )!.name;
    expect(notification).toMatchObject({
      category: 'booking_schedule',
      type: 'waitlist_promoted',
      title: 'Cupo liberado',
      message: `¡Tienes un cupo! Te promovimos de la lista de espera para tu clase de ${className}.`,
      destinationType: 'booking',
    });
  });

  it('pages after a cursor and marks single and all notifications read', async () => {
    const store = createNotificationStore(prisma);
    const [newest, oldest] = await store.findPage({
      accountId,
      after: null,
      limit: 10,
    });

    await expect(
      store.findPage({
        accountId,
        after: { createdAt: newest.createdAt, id: newest.id },
        limit: 10,
      }),
    ).resolves.toEqual([oldest]);

    const readAt = new Date('2026-09-21T12:00:00.000Z');
    await expect(
      store.markRead({ notificationId: newest.id, accountId, readAt }),
    ).resolves.toBe(1);
    await expect(
      store.markRead({
        notificationId: newest.id,
        accountId: '00000000-0000-4000-8000-000000000000',
        readAt,
      }),
    ).resolves.toBe(0);
    await expect(store.countUnread(accountId)).resolves.toBe(1);
    await expect(store.markAllRead({ accountId, readAt })).resolves.toBe(1);
    await expect(store.countUnread(accountId)).resolves.toBe(0);
  });
});
