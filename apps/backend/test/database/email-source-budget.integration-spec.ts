import { randomBytes } from 'node:crypto';
import { jest } from '@jest/globals';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import {
  AuthenticationThrottleEventKind,
  AuthenticationThrottlePurpose,
  PrismaClient,
} from '../../src/generated/prisma/client';
import type { EmailSourceEvents } from '../../src/system-identity/email-source-budget/email-source-budget-policy';
import { PrismaEmailSourceBudgetGateway } from '../../src/system-identity/email-source-budget/prisma-email-source-budget-gateway';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const now = new Date('2026-10-01T15:00:00.000Z');
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000);
const day = 24 * 60 * 60_000;
const digest = () => randomBytes(32);

describe('Email source budget persistence (BE-012)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let gateway: PrismaEmailSourceBudgetGateway;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({
      adapter: createPrismaAdapter(context.databaseUrl),
    });
    gateway = new PrismaEmailSourceBudgetGateway(prisma);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  const requestEvent = (input: {
    purpose?: AuthenticationThrottlePurpose;
    clientDigest?: Uint8Array | null;
    networkDigest: Uint8Array;
    occurredAt: Date;
    deletedAt?: Date;
  }) =>
    prisma.authenticationThrottleEvent.create({
      data: {
        purpose: input.purpose ?? AuthenticationThrottlePurpose.VERIFICATION,
        eventKind: AuthenticationThrottleEventKind.EMAIL_REQUESTED,
        clientDigest: input.clientDigest ?? null,
        networkDigest: input.networkDigest,
        occurredAt: input.occurredAt,
        expiresAt: new Date(input.occurredAt.getTime() + day),
        deletedAt: input.deletedAt ?? null,
      },
    });

  const eventsFor = (networkDigest: Uint8Array) =>
    prisma.authenticationThrottleEvent.findMany({
      where: { networkDigest, deletedAt: null },
      orderBy: { occurredAt: 'asc' },
    });

  it('records an admitted request under its purpose and both digests', async () => {
    const clientDigest = digest();
    const networkDigest = digest();
    const waitSeconds = jest.fn((events: EmailSourceEvents) => {
      void events;
      return 0;
    });

    await expect(
      gateway.admit({
        group: 'password_recovery',
        clientDigest,
        networkDigest,
        now,
        expiresAt: new Date(now.getTime() + day),
        waitSeconds,
      }),
    ).resolves.toBe(0);

    expect(waitSeconds).toHaveBeenCalledWith({ client: [], network: [] });
    expect(await eventsFor(networkDigest)).toEqual([
      expect.objectContaining({
        purpose: AuthenticationThrottlePurpose.PASSWORD_RECOVERY,
        eventKind: AuthenticationThrottleEventKind.EMAIL_REQUESTED,
        recipientDigest: null,
        loginLaneDigest: null,
        clientDigest: new Uint8Array(clientDigest),
        networkDigest: new Uint8Array(networkDigest),
        occurredAt: now,
        expiresAt: new Date(now.getTime() + day),
      }),
    ]);
  });

  it('counts only the live request events of the group in the last day', async () => {
    const clientDigest = digest();
    const networkDigest = digest();
    const otherClient = digest();
    await requestEvent({ clientDigest, networkDigest, occurredAt: ago(5) });
    await requestEvent({
      clientDigest: otherClient,
      networkDigest,
      occurredAt: ago(10),
    });
    await requestEvent({
      clientDigest,
      networkDigest,
      occurredAt: ago(3),
      deletedAt: ago(1),
    });
    await requestEvent({
      clientDigest,
      networkDigest,
      occurredAt: ago(25 * 60),
    });
    await requestEvent({
      purpose: AuthenticationThrottlePurpose.PASSWORD_RECOVERY,
      clientDigest,
      networkDigest,
      occurredAt: ago(2),
    });
    await prisma.authenticationThrottleEvent.create({
      data: {
        purpose: AuthenticationThrottlePurpose.VERIFICATION,
        eventKind: AuthenticationThrottleEventKind.MESSAGE_ISSUED,
        recipientDigest: digest(),
        clientDigest,
        networkDigest,
        occurredAt: ago(4),
        expiresAt: new Date(ago(4).getTime() + day),
      },
    });
    await prisma.authenticationThrottleEvent.create({
      data: {
        purpose: AuthenticationThrottlePurpose.LOGIN,
        eventKind: AuthenticationThrottleEventKind.FAILED_CREDENTIAL_CHECK,
        loginLaneDigest: digest(),
        clientDigest,
        networkDigest,
        occurredAt: ago(1),
        expiresAt: new Date(ago(1).getTime() + 60 * 60_000),
      },
    });
    const waitSeconds = jest.fn((events: EmailSourceEvents) => {
      void events;
      return 0;
    });

    await gateway.admit({
      group: 'verification',
      clientDigest,
      networkDigest,
      now,
      expiresAt: new Date(now.getTime() + day),
      waitSeconds,
    });

    expect(waitSeconds).toHaveBeenCalledTimes(1);
    const [events] = waitSeconds.mock.calls[0];
    expect(events.client).toEqual([ago(5)]);
    expect([...events.network].sort((a, b) => +a - +b)).toEqual([
      ago(10),
      ago(5),
    ]);
  });

  it('records nothing and answers the wait when a lane is full', async () => {
    const networkDigest = digest();
    await requestEvent({ networkDigest, occurredAt: ago(1) });

    await expect(
      gateway.admit({
        group: 'verification',
        clientDigest: digest(),
        networkDigest,
        now,
        expiresAt: new Date(now.getTime() + day),
        waitSeconds: () => 42,
      }),
    ).resolves.toBe(42);

    expect(await eventsFor(networkDigest)).toHaveLength(1);
  });

  it('keys a request without a client identifier by its network alone', async () => {
    const networkDigest = digest();
    const waitSeconds = jest.fn((events: EmailSourceEvents) => {
      void events;
      return 0;
    });

    await gateway.admit({
      group: 'verification',
      clientDigest: null,
      networkDigest,
      now,
      expiresAt: new Date(now.getTime() + day),
      waitSeconds,
    });

    expect(waitSeconds).toHaveBeenCalledWith({ client: null, network: [] });
    expect(await eventsFor(networkDigest)).toEqual([
      expect.objectContaining({ clientDigest: null }),
    ]);
  });

  it('never lets parallel requests from one source overrun the budget', async () => {
    const networkDigest = digest();
    const admit = () =>
      gateway.admit({
        group: 'verification',
        clientDigest: digest(),
        networkDigest,
        now,
        expiresAt: new Date(now.getTime() + day),
        waitSeconds: ({ network }) => (network.length >= 3 ? 30 : 0),
      });

    const waits = await Promise.all(Array.from({ length: 6 }, admit));

    expect(waits.filter((wait) => wait === 0)).toHaveLength(3);
    expect(await eventsFor(networkDigest)).toHaveLength(3);
  });

  it('keeps a soft-deleted row out of the count without removing it', async () => {
    const networkDigest = digest();
    const removed = await requestEvent({
      networkDigest,
      occurredAt: ago(2),
      deletedAt: ago(1),
    });

    await expect(
      gateway.admit({
        group: 'verification',
        clientDigest: null,
        networkDigest,
        now,
        expiresAt: new Date(now.getTime() + day),
        waitSeconds: ({ network }) => (network.length > 0 ? 1 : 0),
      }),
    ).resolves.toBe(0);

    expect(
      await prisma.authenticationThrottleEvent.findUnique({
        where: { id: removed.id },
      }),
    ).toMatchObject({ id: removed.id, deletedAt: ago(1) });
  });
});
