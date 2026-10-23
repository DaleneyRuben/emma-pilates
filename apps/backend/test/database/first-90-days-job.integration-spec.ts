import { PrismaPg } from '@prisma/adapter-pg';
import { createFirst90DaysJob } from '../../src/booking/first-90-days/prisma-first-90-days';
import { PrismaClient } from '../../src/generated/prisma/client';
import { recordNotification } from '../../src/notifications/prisma-notification-store';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';
import {
  createBookedSession,
  createClientWithPlan,
  first90DaysNow,
} from './first-90-days-test-support';

const startsOn = new Date('2026-10-01T00:00:00.000Z');

describe('first 90 days job (PostgreSQL)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  const job = () =>
    createFirst90DaysJob(prisma, () => first90DaysNow, recordNotification);

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('sends each due milestone once and a rerun sends nothing', async () => {
    const client = await createClientWithPlan(prisma, {
      name: 'Valeria Quiroga',
      startsOn,
    });

    await expect(job().execute()).resolves.toEqual({
      messages: 2,
      alerts: 1,
    });
    await expect(job().execute()).resolves.toEqual({
      messages: 0,
      alerts: 0,
    });

    const messages = await prisma.lifecycleMessage.findMany({
      where: { clientId: client.clientId },
      orderBy: { milestone: 'asc' },
    });
    expect(messages.map((row) => row.milestone)).toEqual(['DAY_2', 'WEEK_1']);
    const inbox = await prisma.notification.findMany({
      where: { accountId: client.accountId },
      orderBy: { type: 'asc' },
    });
    expect(inbox.map((row) => row.type)).toEqual([
      'lifecycle_day_2',
      'lifecycle_week_1',
    ]);
    expect(inbox.every((row) => row.destinationType === null)).toBe(true);
    const alerts = await prisma.contactAlert.findMany({
      where: { clientId: client.clientId },
    });
    expect(alerts).toEqual([
      expect.objectContaining({
        reason: 'NO_BOOKING_7_DAYS',
        contactedAt: null,
      }),
    ]);
  });

  it('never starts the clock from a courtesy Subscription', async () => {
    const free = await createClientWithPlan(prisma, {
      name: 'Cortesía',
      startsOn,
      priceCentavos: 0,
    });
    const hidden = await createClientWithPlan(prisma, {
      name: 'Oculto',
      startsOn,
      hiddenAt: startsOn,
      priceCentavos: 56_000,
    });

    await job().execute();
    expect(
      await prisma.lifecycleMessage.count({
        where: { clientId: { in: [free.clientId, hidden.clientId] } },
      }),
    ).toBe(0);
    expect(
      await prisma.contactAlert.count({
        where: { clientId: { in: [free.clientId, hidden.clientId] } },
      }),
    ).toBe(0);
  });

  it('opens the 7-day alert and leaves it when she has not booked', async () => {
    const client = await createClientWithPlan(prisma, {
      name: 'Sin reserva',
      startsOn,
    });
    await job().execute();
    expect(
      await prisma.contactAlert.count({
        where: { clientId: client.clientId, contactedAt: null },
      }),
    ).toBe(1);
  });

  it('opens the day-15 alert when she has fewer than 2 classes', async () => {
    const day15 = new Date('2026-10-16T16:00:00.000Z');
    const client = await createClientWithPlan(prisma, {
      name: 'Pocas clases',
      startsOn,
    });
    await createBookedSession(prisma, {
      clientId: client.clientId,
      subscriptionId: client.subscriptionId,
      accountId: client.accountId,
      createdAt: new Date('2026-10-12T15:00:00.000Z'),
      startsAt: new Date('2026-10-12T15:00:00.000Z'),
    });

    await createFirst90DaysJob(
      prisma,
      () => day15,
      recordNotification,
    ).execute();
    const alerts = await prisma.contactAlert.findMany({
      where: { clientId: client.clientId },
    });
    expect(alerts.map((row) => row.reason)).toEqual([
      'FEWER_THAN_2_CLASSES_BY_DAY_15',
    ]);
  });

  it('does not open the 7-day alert when she booked recently or has a class ahead', async () => {
    const recent = await createClientWithPlan(prisma, {
      name: 'Reciente',
      startsOn,
    });
    await createBookedSession(prisma, {
      clientId: recent.clientId,
      subscriptionId: recent.subscriptionId,
      accountId: recent.accountId,
      createdAt: new Date('2026-10-06T15:00:00.000Z'),
      startsAt: new Date('2026-10-06T15:00:00.000Z'),
    });
    const ahead = await createClientWithPlan(prisma, {
      name: 'Adelante',
      startsOn,
    });
    await createBookedSession(prisma, {
      clientId: ahead.clientId,
      subscriptionId: ahead.subscriptionId,
      accountId: ahead.accountId,
      createdAt: new Date('2026-10-02T15:00:00.000Z'),
      startsAt: new Date('2026-10-20T15:00:00.000Z'),
    });

    await job().execute();
    expect(
      await prisma.contactAlert.count({
        where: {
          clientId: { in: [recent.clientId, ahead.clientId] },
        },
      }),
    ).toBe(0);
  });
});
