import { jest } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PgBoss } from 'pg-boss';
import { PrismaClient } from '../../src/generated/prisma/client';
import { parsePushDispatchJob } from '../../src/jobs/push-dispatch/push-dispatch-job';
import { createPrismaAccountDevices } from '../../src/notifications/devices/prisma-account-devices';
import { createNotificationRecorder } from '../../src/notifications/prisma-notification-store';
import { createPushDeliveryRuntime } from '../../src/notifications/push/push-delivery-runtime';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

// The whole worker path on a real database, with Expo faked at fetch.
describe('push delivery runtime (NOT-002)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let boss: PgBoss;
  let clock: Date;

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

  it('sends a recorded notification to the signed-in device and settles its receipt', async () => {
    clock = new Date();
    const clientId = randomUUID();
    const accountId = randomUUID();
    await prisma.client.create({
      data: {
        id: clientId,
        name: 'Push Runtime Test',
        referralCode: `ref-${clientId}`,
        account: {
          create: { id: accountId, email: `${accountId}@example.com` },
        },
      },
    });
    const sessionId = randomUUID();
    await prisma.authenticationSession.create({
      data: {
        id: sessionId,
        accountId,
        surface: 'MOBILE',
        credentialDigest: Buffer.from(randomUUID()),
        createdAt: new Date(clock.getTime() - 60_000),
        lastMeaningfulActivityAt: new Date(clock.getTime() - 60_000),
        idleExpiresAt: new Date(clock.getTime() + 86_400_000),
        absoluteExpiresAt: new Date(clock.getTime() + 86_400_000),
      },
    });
    const expoPushToken = `ExponentPushToken[${randomUUID()}]`;
    await createPrismaAccountDevices(prisma).registerCurrentDevice({
      accountId,
      authenticationSessionId: sessionId,
      installationId: randomUUID(),
      expoPushToken,
      platform: 'android',
    });
    await prisma.$transaction((transaction) =>
      createNotificationRecorder(boss)(transaction, {
        accountId,
        category: 'subscription_payment',
        type: 'payment_rejected',
        businessEventKey: `payment-rejected:${randomUUID()}`,
        title: 'Comprobante rechazado',
        message: 'Tu comprobante fue rechazado: monto Bs 350 incorrecto.',
        destination: { type: 'subscription', id: randomUUID() },
        occurredAt: clock,
      }),
    );
    const {
      rows: [queued],
    } = await context.pool.query<{ data: unknown }>(
      `select data from pgboss.job where data->>'accountId' = $1`,
      [accountId],
    );
    const ticketId = randomUUID();
    const fetch = jest
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        Response.json({ data: [{ status: 'ok', id: ticketId }] }),
      )
      .mockResolvedValueOnce(
        Response.json({ data: { [ticketId]: { status: 'ok' } } }),
      );
    const runtime = createPushDeliveryRuntime({
      prisma,
      fetch,
      expoAccessToken: 'expo-token',
      now: () => clock,
    });

    await expect(
      runtime.pushDispatch.dispatch(parsePushDispatchJob(queued.data)),
    ).resolves.toEqual({ outcome: 'sent', submitted: 1, failed: 0 });
    const [, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual([
      expect.objectContaining({
        to: expoPushToken,
        title: 'Comprobante rechazado',
        body: 'Revisa tu pago en la app.',
        sound: 'default',
        badge: 1,
        channelId: 'actionable',
      }),
    ]);

    clock = new Date(clock.getTime() + 16 * 60_000);
    await expect(runtime.pushReceipts.execute()).resolves.toMatchObject({
      checked: 1,
      delivered: 1,
    });
    await expect(
      prisma.notificationDelivery.findFirstOrThrow({
        where: { providerTicketId: ticketId },
      }),
    ).resolves.toMatchObject({ state: 'DELIVERED' });
  });
});
