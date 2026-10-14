import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaAccountDevices } from '../../src/notifications/devices/prisma-account-devices';
import { createPrismaPushDeliveries } from '../../src/notifications/push/prisma-push-deliveries';
import { recordNotification } from '../../src/notifications/prisma-notification-store';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const at = new Date('2026-09-21T12:00:00.000Z');

describe('Push deliveries (NOT-002)', () => {
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

  const deliveries = () => createPrismaPushDeliveries(prisma, () => at);

  const createAccount = async (): Promise<string> => {
    const clientId = randomUUID();
    const accountId = randomUUID();
    await prisma.client.create({
      data: {
        id: clientId,
        name: 'Push Delivery Test',
        referralCode: `ref-${clientId}`,
        account: {
          create: { id: accountId, email: `${accountId}@example.com` },
        },
      },
    });
    return accountId;
  };

  const signIn = async (
    accountId: string,
    expiresAt = new Date('2026-12-01T12:00:00.000Z'),
  ) => {
    const sessionId = randomUUID();
    await prisma.authenticationSession.create({
      data: {
        id: sessionId,
        accountId,
        surface: 'MOBILE',
        credentialDigest: Buffer.from(randomUUID()),
        createdAt: new Date('2026-09-01T12:00:00.000Z'),
        lastMeaningfulActivityAt: new Date('2026-09-01T12:00:00.000Z'),
        idleExpiresAt: expiresAt,
        absoluteExpiresAt: expiresAt,
      },
    });
    const expoPushToken = `ExponentPushToken[${randomUUID()}]`;
    await createPrismaAccountDevices(prisma, () => at).registerCurrentDevice({
      accountId,
      authenticationSessionId: sessionId,
      installationId: randomUUID(),
      expoPushToken,
      platform: 'android',
    });
    const device = await prisma.accountDevice.findFirstOrThrow({
      where: { expoPushToken },
    });
    return { sessionId, deviceId: device.id, expoPushToken };
  };

  const notify = async (accountId: string) => {
    const businessEventKey = `waitlist-promoted:${randomUUID()}`;
    await recordNotification(prisma, {
      accountId,
      category: 'booking_schedule',
      type: 'waitlist_promoted',
      businessEventKey,
      title: 'Cupo liberado',
      message: '¡Tienes un cupo!',
      destination: { type: 'booking', id: randomUUID() },
      occurredAt: at,
    });
    return businessEventKey;
  };

  it('finds an unread entry by its business event and ignores a read one', async () => {
    const accountId = await createAccount();
    const businessEventKey = await notify(accountId);

    const found = await deliveries().findNotification({
      accountId,
      businessEventKey,
    });
    expect(found).toMatchObject({
      type: 'waitlist_promoted',
      title: 'Cupo liberado',
      destinationType: 'booking',
    });

    await prisma.notification.updateMany({
      where: { accountId },
      data: { readAt: at },
    });
    await expect(
      deliveries().findNotification({ accountId, businessEventKey }),
    ).resolves.toBeNull();
  });

  it('prepares one queued delivery per device with a live session, once', async () => {
    const accountId = await createAccount();
    const live = await signIn(accountId);
    await signIn(accountId, new Date('2026-09-20T12:00:00.000Z'));
    const businessEventKey = await notify(accountId);
    const notification = (await deliveries().findNotification({
      accountId,
      businessEventKey,
    }))!;

    const first = await deliveries().prepareDeliveries({
      notificationId: notification.id,
      accountId,
    });
    const again = await deliveries().prepareDeliveries({
      notificationId: notification.id,
      accountId,
    });

    expect(first).toEqual([
      {
        deliveryId: expect.any(String) as string,
        deviceId: live.deviceId,
        expoPushToken: live.expoPushToken,
      },
    ]);
    expect(again).toEqual(first);
    await expect(
      prisma.notificationDelivery.count({
        where: { notificationId: notification.id },
      }),
    ).resolves.toBe(1);
  });

  it('records tickets, and deactivates a device Expo no longer knows', async () => {
    const accountId = await createAccount();
    const reachable = await signIn(accountId);
    const gone = await signIn(accountId);
    const businessEventKey = await notify(accountId);
    const notification = (await deliveries().findNotification({
      accountId,
      businessEventKey,
    }))!;
    const prepared = await deliveries().prepareDeliveries({
      notificationId: notification.id,
      accountId,
    });
    const byDevice = new Map(prepared.map((d) => [d.deviceId, d]));
    const ticketId = randomUUID();

    await deliveries().recordTickets(
      [
        {
          ...byDevice.get(reachable.deviceId)!,
          ticket: { status: 'ok', id: ticketId },
        },
        {
          ...byDevice.get(gone.deviceId)!,
          ticket: {
            status: 'error',
            category: 'device_not_registered',
            deviceNotRegistered: true,
          },
        },
      ],
      at,
    );

    await expect(
      prisma.notificationDelivery.findUniqueOrThrow({
        where: { id: byDevice.get(reachable.deviceId)!.deliveryId },
      }),
    ).resolves.toMatchObject({
      state: 'SUBMITTED',
      providerTicketId: ticketId,
      attemptCount: 1,
      lastAttemptAt: at,
    });
    await expect(
      prisma.notificationDelivery.findUniqueOrThrow({
        where: { id: byDevice.get(gone.deviceId)!.deliveryId },
      }),
    ).resolves.toMatchObject({
      state: 'FAILED',
      failureCategory: 'device_not_registered',
      completedAt: at,
    });
    await expect(
      prisma.accountDevice.findUniqueOrThrow({ where: { id: gone.deviceId } }),
    ).resolves.toMatchObject({
      deactivationReason: 'DEVICE_NOT_REGISTERED',
      expoPushToken: null,
    });
    await expect(
      deliveries().prepareDeliveries({
        notificationId: notification.id,
        accountId,
      }),
    ).resolves.toEqual([]);
  });

  it('keeps a delivery queued after a transient attempt and fails it after a final one', async () => {
    const accountId = await createAccount();
    await signIn(accountId);
    const businessEventKey = await notify(accountId);
    const notification = (await deliveries().findNotification({
      accountId,
      businessEventKey,
    }))!;
    const [delivery] = await deliveries().prepareDeliveries({
      notificationId: notification.id,
      accountId,
    });

    await deliveries().recordAttempt(
      [delivery.deliveryId],
      { category: 'provider_unavailable', final: false },
      at,
    );
    await expect(
      prisma.notificationDelivery.findUniqueOrThrow({
        where: { id: delivery.deliveryId },
      }),
    ).resolves.toMatchObject({
      state: 'QUEUED',
      attemptCount: 1,
      failureCategory: 'provider_unavailable',
    });

    await deliveries().recordAttempt(
      [delivery.deliveryId],
      { category: 'provider_authentication', final: true },
      at,
    );
    await expect(
      prisma.notificationDelivery.findUniqueOrThrow({
        where: { id: delivery.deliveryId },
      }),
    ).resolves.toMatchObject({
      state: 'FAILED',
      attemptCount: 2,
      failureCategory: 'provider_authentication',
      completedAt: at,
    });
  });

  it('discards a queued delivery whose device was deactivated meanwhile', async () => {
    const accountId = await createAccount();
    const device = await signIn(accountId);
    const businessEventKey = await notify(accountId);
    const notification = (await deliveries().findNotification({
      accountId,
      businessEventKey,
    }))!;
    const [delivery] = await deliveries().prepareDeliveries({
      notificationId: notification.id,
      accountId,
    });
    await prisma.accountDevice.update({
      where: { id: device.deviceId },
      data: {
        deactivatedAt: at,
        deactivationReason: 'LOGOUT',
        expoPushToken: null,
      },
    });

    await expect(
      deliveries().prepareDeliveries({
        notificationId: notification.id,
        accountId,
      }),
    ).resolves.toEqual([]);
    await expect(
      prisma.notificationDelivery.findUniqueOrThrow({
        where: { id: delivery.deliveryId },
      }),
    ).resolves.toMatchObject({
      state: 'DISCARDED',
      failureCategory: 'device_inactive',
    });
  });

  it('counts the Account’s unread entries for the badge', async () => {
    const accountId = await createAccount();
    await notify(accountId);
    await notify(accountId);

    await expect(deliveries().countUnread(accountId)).resolves.toBe(2);
  });
});
