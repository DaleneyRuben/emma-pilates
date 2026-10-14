import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaPushReceipts } from '../../src/notifications/push/prisma-push-receipts';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const at = new Date('2026-09-21T12:00:00.000Z');
const minutesBefore = (minutes: number) =>
  new Date(at.getTime() - minutes * 60_000);

describe('Push receipts (NOT-002)', () => {
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

  const receipts = () => createPrismaPushReceipts(prisma);

  // One Account with one device and one submitted delivery per call.
  const submittedDelivery = async (submittedAt: Date) => {
    const clientId = randomUUID();
    const accountId = randomUUID();
    await prisma.client.create({
      data: {
        id: clientId,
        name: 'Push Receipt Test',
        referralCode: `ref-${clientId}`,
        account: {
          create: { id: accountId, email: `${accountId}@example.com` },
        },
      },
    });
    const device = await prisma.accountDevice.create({
      data: {
        accountId,
        installationIdDigest: Buffer.from(randomUUID()),
        expoPushToken: `ExponentPushToken[${randomUUID()}]`,
        platform: 'IOS',
        registeredAt: minutesBefore(60 * 48),
        tokenUpdatedAt: minutesBefore(60 * 48),
        lastSeenAt: minutesBefore(60 * 48),
      },
    });
    const notification = await prisma.notification.create({
      data: {
        accountId,
        category: 'BOOKING_SCHEDULE',
        type: 'waitlist_promoted',
        businessEventKey: randomUUID(),
        title: 'Cupo liberado',
        message: '¡Tienes un cupo!',
        createdAt: minutesBefore(60 * 48),
      },
    });
    const ticketId = randomUUID();
    const delivery = await prisma.notificationDelivery.create({
      data: {
        notificationId: notification.id,
        accountDeviceId: device.id,
        state: 'SUBMITTED',
        providerTicketId: ticketId,
        attemptCount: 1,
        lastAttemptAt: submittedAt,
        createdAt: submittedAt,
      },
    });
    return { deliveryId: delivery.id, deviceId: device.id, ticketId };
  };

  const deliveryState = (id: string) =>
    prisma.notificationDelivery.findUniqueOrThrow({ where: { id } });

  it('finds deliveries submitted before the cutoff, least recently checked first', async () => {
    const old = await submittedDelivery(minutesBefore(30));
    const fresh = await submittedDelivery(minutesBefore(5));
    const checked = await submittedDelivery(minutesBefore(40));
    await prisma.notificationDelivery.update({
      where: { id: checked.deliveryId },
      data: { receiptCheckedAt: minutesBefore(1) },
    });

    const found = await receipts().findSubmitted({
      submittedBefore: minutesBefore(15),
      limit: 1000,
    });
    const ids = found.map((delivery) => delivery.deliveryId);

    expect(ids).toContain(old.deliveryId);
    expect(ids).not.toContain(fresh.deliveryId);
    expect(ids.indexOf(old.deliveryId)).toBeLessThan(
      ids.indexOf(checked.deliveryId),
    );
    expect(found.find((d) => d.deliveryId === old.deliveryId)).toEqual(old);
  });

  it('settles deliveries from their receipts and deactivates unregistered devices', async () => {
    const delivered = await submittedDelivery(minutesBefore(20));
    const gone = await submittedDelivery(minutesBefore(20));
    const pending = await submittedDelivery(minutesBefore(20));

    await receipts().recordReceipts(
      [
        { ...delivered, outcome: { status: 'ok' } },
        {
          ...gone,
          outcome: {
            status: 'error',
            category: 'device_not_registered',
            deviceNotRegistered: true,
          },
        },
        { ...pending, outcome: null },
      ],
      at,
    );

    await expect(deliveryState(delivered.deliveryId)).resolves.toMatchObject({
      state: 'DELIVERED',
      completedAt: at,
      receiptCheckedAt: at,
    });
    await expect(deliveryState(gone.deliveryId)).resolves.toMatchObject({
      state: 'FAILED',
      failureCategory: 'device_not_registered',
      completedAt: at,
    });
    await expect(
      prisma.accountDevice.findUniqueOrThrow({ where: { id: gone.deviceId } }),
    ).resolves.toMatchObject({ deactivationReason: 'DEVICE_NOT_REGISTERED' });
    await expect(deliveryState(pending.deliveryId)).resolves.toMatchObject({
      state: 'SUBMITTED',
      receiptCheckedAt: at,
      completedAt: null,
    });
  });

  it('discards deliveries still unconfirmed after a day', async () => {
    const stale = await submittedDelivery(minutesBefore(60 * 25));
    const recent = await submittedDelivery(minutesBefore(60 * 23));

    const discarded = await receipts().discardUnconfirmed(
      minutesBefore(60 * 24),
      at,
    );

    expect(discarded).toBeGreaterThanOrEqual(1);
    await expect(deliveryState(stale.deliveryId)).resolves.toMatchObject({
      state: 'DISCARDED',
      failureCategory: 'receipt_unavailable',
      completedAt: at,
    });
    await expect(deliveryState(recent.deliveryId)).resolves.toMatchObject({
      state: 'SUBMITTED',
    });
  });
});
