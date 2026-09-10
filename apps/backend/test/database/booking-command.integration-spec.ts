import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  BookingCancellationCause,
  BookingState,
  PrismaClient,
} from '../../src/generated/prisma/client';
import { PrismaBookingCommands } from '../../src/booking/commands/prisma-booking-commands';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

describe('Booking commands', () => {
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

  it('creates a Booking and consumes one allowance atomically', async () => {
    const fixture = await createFixture(prisma);
    const commands = new PrismaBookingCommands(prisma, () => fixture.now);

    const booking = await commands.create(
      { sessionId: fixture.sessionId },
      {
        accountId: fixture.accountId,
        authenticationSessionId: randomUUID(),
        identity: { kind: 'client', clientId: fixture.clientId },
      },
    );

    expect(booking.id).toEqual(expect.any(String));

    await expect(
      prisma.subscription.findUniqueOrThrow({
        where: { id: fixture.subscriptionId },
        select: { remainingClassAllowance: true },
      }),
    ).resolves.toEqual({ remainingClassAllowance: 1 });
  });

  it('replays a Booking command without consuming another allowance', async () => {
    const fixture = await createFixture(prisma);
    const commands = new PrismaBookingCommands(prisma, () => fixture.now);
    const principal = {
      accountId: fixture.accountId,
      authenticationSessionId: randomUUID(),
      identity: { kind: 'client' as const, clientId: fixture.clientId },
    };
    const idempotencyKey = randomUUID();

    const first = await commands.createIdempotent(
      { sessionId: fixture.sessionId },
      principal,
      idempotencyKey,
    );
    const replay = await commands.createIdempotent(
      { sessionId: fixture.sessionId },
      principal,
      idempotencyKey,
    );

    expect(replay).toEqual(first);
    await expect(
      prisma.subscription.findUniqueOrThrow({
        where: { id: fixture.subscriptionId },
        select: { remainingClassAllowance: true },
      }),
    ).resolves.toEqual({ remainingClassAllowance: 1 });
  });

  it('joins a full Session Waitlist without consuming allowance', async () => {
    const fixture = await createFixture(prisma, { capacity: 1 });
    const commands = new PrismaBookingCommands(prisma, () => fixture.now);

    await commands.create(
      { sessionId: fixture.sessionId },
      {
        accountId: fixture.accountId,
        authenticationSessionId: randomUUID(),
        identity: { kind: 'client', clientId: fixture.clientId },
      },
    );

    const waitingClient = await createClientWithSubscription(prisma);
    const entry = await commands.joinWaitlist(
      { sessionId: fixture.sessionId },
      {
        accountId: waitingClient.accountId,
        authenticationSessionId: randomUUID(),
        identity: { kind: 'client', clientId: waitingClient.clientId },
      },
    );

    expect(entry.id).toEqual(expect.any(String));
    await expect(
      prisma.subscription.findUniqueOrThrow({
        where: { id: waitingClient.subscriptionId },
        select: { remainingClassAllowance: true },
      }),
    ).resolves.toEqual({ remainingClassAllowance: 2 });
  });

  it('replays a Waitlist command without creating another entry', async () => {
    const fixture = await createFixture(prisma, { capacity: 1 });
    const commands = new PrismaBookingCommands(prisma, () => fixture.now);

    await commands.create(
      { sessionId: fixture.sessionId },
      {
        accountId: fixture.accountId,
        authenticationSessionId: randomUUID(),
        identity: { kind: 'client', clientId: fixture.clientId },
      },
    );

    const waitingClient = await createClientWithSubscription(prisma);
    const principal = {
      accountId: waitingClient.accountId,
      authenticationSessionId: randomUUID(),
      identity: { kind: 'client' as const, clientId: waitingClient.clientId },
    };
    const idempotencyKey = randomUUID();

    const first = await commands.joinWaitlistIdempotent(
      { sessionId: fixture.sessionId },
      principal,
      idempotencyKey,
    );
    const replay = await commands.joinWaitlistIdempotent(
      { sessionId: fixture.sessionId },
      principal,
      idempotencyKey,
    );

    expect(replay).toEqual(first);
    await expect(
      prisma.waitlistEntry.count({
        where: {
          sessionId: fixture.sessionId,
          clientId: waitingClient.clientId,
        },
      }),
    ).resolves.toBe(1);
  });

  it('promotes the first eligible Waitlist Entry and consumes allowance', async () => {
    const fixture = await createFixture(prisma, { capacity: 1 });
    const commands = new PrismaBookingCommands(prisma, () => fixture.now);
    const booking = await commands.create(
      { sessionId: fixture.sessionId },
      {
        accountId: fixture.accountId,
        authenticationSessionId: randomUUID(),
        identity: { kind: 'client', clientId: fixture.clientId },
      },
    );
    const waitingClient = await createClientWithSubscription(prisma);

    await commands.joinWaitlist(
      { sessionId: fixture.sessionId },
      {
        accountId: waitingClient.accountId,
        authenticationSessionId: randomUUID(),
        identity: { kind: 'client', clientId: waitingClient.clientId },
      },
    );
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        state: BookingState.CANCELLED,
        cancelledAt: fixture.now,
        cancelledByAccountId: fixture.accountId,
        cancellationCause: BookingCancellationCause.CLIENT_REQUEST,
      },
    });

    const promotions = await commands.promoteWaitlist(fixture.sessionId);

    expect(promotions).toHaveLength(1);
    expect(promotions[0]?.entryId).toEqual(expect.any(String));
    expect(promotions[0]?.bookingId).toEqual(expect.any(String));
    await expect(
      prisma.subscription.findUniqueOrThrow({
        where: { id: waitingClient.subscriptionId },
        select: { remainingClassAllowance: true },
      }),
    ).resolves.toEqual({ remainingClassAllowance: 1 });
    const entry = await prisma.waitlistEntry.findFirstOrThrow({
      where: {
        sessionId: fixture.sessionId,
        clientId: waitingClient.clientId,
      },
      select: { closedAt: true, promotedBookingId: true },
    });

    expect(entry.closedAt).toEqual(fixture.now);
    expect(entry.promotedBookingId).toEqual(expect.any(String));
  });

  it('promotes the Waitlist before a direct Booking uses freed capacity', async () => {
    const fixture = await createFixture(prisma, { capacity: 1 });
    const commands = new PrismaBookingCommands(prisma, () => fixture.now);
    const booking = await commands.create(
      { sessionId: fixture.sessionId },
      {
        accountId: fixture.accountId,
        authenticationSessionId: randomUUID(),
        identity: { kind: 'client', clientId: fixture.clientId },
      },
    );
    const waitingClient = await createClientWithSubscription(prisma);
    const directClient = await createClientWithSubscription(prisma);

    await commands.joinWaitlist(
      { sessionId: fixture.sessionId },
      {
        accountId: waitingClient.accountId,
        authenticationSessionId: randomUUID(),
        identity: { kind: 'client', clientId: waitingClient.clientId },
      },
    );
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        state: BookingState.CANCELLED,
        cancelledAt: fixture.now,
        cancelledByAccountId: fixture.accountId,
        cancellationCause: BookingCancellationCause.CLIENT_REQUEST,
      },
    });

    await expect(
      commands.create(
        { sessionId: fixture.sessionId },
        {
          accountId: directClient.accountId,
          authenticationSessionId: randomUUID(),
          identity: { kind: 'client', clientId: directClient.clientId },
        },
      ),
    ).rejects.toThrow('Session is full');

    await expect(
      prisma.subscription.findUniqueOrThrow({
        where: { id: waitingClient.subscriptionId },
        select: { remainingClassAllowance: true },
      }),
    ).resolves.toEqual({ remainingClassAllowance: 1 });
  });

  it('prioritizes the Waitlist before an idempotent Booking uses freed capacity', async () => {
    const fixture = await createFixture(prisma, { capacity: 1 });
    const commands = new PrismaBookingCommands(prisma, () => fixture.now);
    const booking = await commands.create(
      { sessionId: fixture.sessionId },
      {
        accountId: fixture.accountId,
        authenticationSessionId: randomUUID(),
        identity: { kind: 'client', clientId: fixture.clientId },
      },
    );
    const waitingClient = await createClientWithSubscription(prisma);
    const directClient = await createClientWithSubscription(prisma);

    await commands.joinWaitlist(
      { sessionId: fixture.sessionId },
      {
        accountId: waitingClient.accountId,
        authenticationSessionId: randomUUID(),
        identity: { kind: 'client', clientId: waitingClient.clientId },
      },
    );
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        state: BookingState.CANCELLED,
        cancelledAt: fixture.now,
        cancelledByAccountId: fixture.accountId,
        cancellationCause: BookingCancellationCause.CLIENT_REQUEST,
      },
    });

    await expect(
      commands.createIdempotent(
        { sessionId: fixture.sessionId },
        {
          accountId: directClient.accountId,
          authenticationSessionId: randomUUID(),
          identity: { kind: 'client', clientId: directClient.clientId },
        },
        randomUUID(),
      ),
    ).rejects.toThrow('Session is full');

    await expect(
      prisma.subscription.findUniqueOrThrow({
        where: { id: waitingClient.subscriptionId },
        select: { remainingClassAllowance: true },
      }),
    ).resolves.toEqual({ remainingClassAllowance: 1 });
  });
});

const createFixture = async (
  prisma: PrismaClient,
  options: { capacity?: number } = {},
) => {
  const now = new Date('2026-09-10T12:00:00Z');
  const branch = await prisma.branch.create({
    data: { name: randomUUID(), address: 'Calle Uno' },
  });
  const trainer = await prisma.staffMember.create({
    data: { name: 'Trainer', role: 'TRAINER' },
  });
  const classType = await prisma.classType.create({
    data: {
      name: randomUUID(),
      description: 'Clase',
      durationMinutes: 60,
      defaultCapacity: 8,
    },
  });
  const session = await prisma.session.create({
    data: {
      branchId: branch.id,
      classTypeId: classType.id,
      trainerStaffMemberId: trainer.id,
      startsAt: new Date('2026-09-10T16:00:00Z'),
      endsAt: new Date('2026-09-10T17:00:00Z'),
      capacity: options.capacity ?? 8,
    },
  });
  const client = await prisma.client.create({
    data: { name: 'Ana', referralCode: randomUUID() },
  });
  const account = await prisma.account.create({
    data: { email: `${randomUUID()}@example.com`, clientId: client.id },
  });
  const plan = await prisma.plan.create({
    data: {
      name: randomUUID(),
      durationMonths: 1,
      classAllowance: 2,
      priceCentavos: 10000,
      displayOrder: 0,
    },
  });
  const subscription = await prisma.subscription.create({
    data: {
      clientId: client.id,
      planId: plan.id,
      planNameSnapshot: plan.name,
      durationMonthsSnapshot: 1,
      originalClassAllowance: 2,
      remainingClassAllowance: 2,
      startsOn: new Date('2026-09-01'),
      endsOn: new Date('2026-09-30'),
      activatedAt: now,
    },
  });

  return {
    now,
    accountId: account.id,
    clientId: client.id,
    sessionId: session.id,
    subscriptionId: subscription.id,
  };
};

const createClientWithSubscription = async (prisma: PrismaClient) => {
  const client = await prisma.client.create({
    data: { name: 'Bea', referralCode: randomUUID() },
  });
  const account = await prisma.account.create({
    data: { email: `${randomUUID()}@example.com`, clientId: client.id },
  });
  const plan = await prisma.plan.create({
    data: {
      name: randomUUID(),
      durationMonths: 1,
      classAllowance: 2,
      priceCentavos: 10000,
      displayOrder: 0,
    },
  });
  const subscription = await prisma.subscription.create({
    data: {
      clientId: client.id,
      planId: plan.id,
      planNameSnapshot: plan.name,
      durationMonthsSnapshot: 1,
      originalClassAllowance: 2,
      remainingClassAllowance: 2,
      startsOn: new Date('2026-09-01'),
      endsOn: new Date('2026-09-30'),
      activatedAt: new Date('2026-09-10T12:00:00Z'),
    },
  });

  return {
    accountId: account.id,
    clientId: client.id,
    subscriptionId: subscription.id,
  };
};
