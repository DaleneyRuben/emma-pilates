import { randomBytes, randomUUID } from 'node:crypto';
import { jest } from '@jest/globals';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import {
  AuthenticationThrottleEventKind,
  AuthenticationThrottlePurpose,
  PrismaClient,
} from '../../src/generated/prisma/client';
import { PrismaStaffEmailBudgetGateway } from '../../src/system-identity/staff-email-budget/prisma-staff-email-budget-gateway';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const now = new Date('2026-10-01T15:00:00.000Z');
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000);
const day = 24 * 60 * 60_000;

describe('Staff email budget persistence (BE-013)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let gateway: PrismaStaffEmailBudgetGateway;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({
      adapter: createPrismaAdapter(context.databaseUrl),
    });
    gateway = new PrismaStaffEmailBudgetGateway(prisma);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  const newStaffAccount = async () => {
    const account = await prisma.account.create({
      data: {
        email: `${randomUUID()}@example.com`,
        activatedAt: ago(60 * 24 * 30),
        emailVerifiedAt: ago(60 * 24 * 30),
        staffMember: { create: { name: 'Asistente', role: 'ASSISTANT' } },
      },
    });
    return account.id;
  };

  const staffEvent = (input: {
    accountId: string;
    purpose?: AuthenticationThrottlePurpose;
    occurredAt: Date;
    deletedAt?: Date;
  }) =>
    prisma.authenticationThrottleEvent.create({
      data: {
        purpose: input.purpose ?? AuthenticationThrottlePurpose.ACTIVATION,
        eventKind: AuthenticationThrottleEventKind.STAFF_EMAIL_REQUESTED,
        accountId: input.accountId,
        occurredAt: input.occurredAt,
        expiresAt: new Date(input.occurredAt.getTime() + day),
        deletedAt: input.deletedAt ?? null,
      },
    });

  const eventsFor = (accountId: string) =>
    prisma.authenticationThrottleEvent.findMany({
      where: { accountId, deletedAt: null },
      orderBy: { occurredAt: 'asc' },
    });

  const admit = (
    accountId: string,
    waitSeconds: (occurredAt: readonly Date[]) => number,
    purpose: 'activation' | 'verification' = 'activation',
  ) =>
    gateway.admit({
      accountId,
      purpose,
      now,
      expiresAt: new Date(now.getTime() + day),
      waitSeconds,
    });

  it('records an admitted request under the Account and its purpose alone', async () => {
    const accountId = await newStaffAccount();
    const waitSeconds = jest.fn((occurredAt: readonly Date[]) => {
      void occurredAt;
      return 0;
    });

    await expect(admit(accountId, waitSeconds, 'verification')).resolves.toBe(
      0,
    );

    expect(waitSeconds).toHaveBeenCalledWith([]);
    expect(await eventsFor(accountId)).toEqual([
      expect.objectContaining({
        purpose: AuthenticationThrottlePurpose.VERIFICATION,
        eventKind: AuthenticationThrottleEventKind.STAFF_EMAIL_REQUESTED,
        accountId,
        recipientDigest: null,
        loginLaneDigest: null,
        clientDigest: null,
        networkDigest: null,
        occurredAt: now,
        expiresAt: new Date(now.getTime() + day),
      }),
    ]);
  });

  it('counts the Account’s live staff events of both purposes in the last day', async () => {
    const accountId = await newStaffAccount();
    const otherAccount = await newStaffAccount();
    await staffEvent({ accountId, occurredAt: ago(5) });
    await staffEvent({
      accountId,
      purpose: AuthenticationThrottlePurpose.VERIFICATION,
      occurredAt: ago(4),
    });
    await staffEvent({ accountId: otherAccount, occurredAt: ago(3) });
    await staffEvent({ accountId, occurredAt: ago(2), deletedAt: ago(1) });
    await staffEvent({ accountId, occurredAt: ago(25 * 60) });
    await prisma.authenticationThrottleEvent.create({
      data: {
        purpose: AuthenticationThrottlePurpose.VERIFICATION,
        eventKind: AuthenticationThrottleEventKind.EMAIL_REQUESTED,
        networkDigest: new Uint8Array(randomBytes(32)),
        occurredAt: ago(1),
        expiresAt: new Date(ago(1).getTime() + day),
      },
    });
    const waitSeconds = jest.fn((occurredAt: readonly Date[]) => {
      void occurredAt;
      return 0;
    });

    await admit(accountId, waitSeconds);

    const [occurredAt] = waitSeconds.mock.calls[0];
    expect([...occurredAt].sort((a, b) => +a - +b)).toEqual([ago(5), ago(4)]);
  });

  it('records nothing and answers the wait when the budget is full', async () => {
    const accountId = await newStaffAccount();
    await staffEvent({ accountId, occurredAt: ago(1) });

    await expect(admit(accountId, () => 42)).resolves.toBe(42);

    expect(await eventsFor(accountId)).toHaveLength(1);
  });

  it('never lets parallel requests from one Account overrun the budget', async () => {
    const accountId = await newStaffAccount();

    const waits = await Promise.all(
      Array.from({ length: 6 }, () =>
        admit(accountId, (occurredAt) => (occurredAt.length >= 3 ? 30 : 0)),
      ),
    );

    expect(waits.filter((wait) => wait === 0)).toHaveLength(3);
    expect(await eventsFor(accountId)).toHaveLength(3);
  });
});
