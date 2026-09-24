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

  it('rejects a second active Waitlist Entry for the same Client', async () => {
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

    await commands.joinWaitlist({ sessionId: fixture.sessionId }, principal);
    await expect(
      commands.joinWaitlist({ sessionId: fixture.sessionId }, principal),
    ).rejects.toThrow('Client already has an active Waitlist Entry');
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
        cancelledAt: new Date(),
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

    expect(entry.closedAt).toEqual(expect.any(Date));
    expect(entry.promotedBookingId).toEqual(expect.any(String));
  });

  it('cancels a Booking, restores its allowance, and promotes the oldest eligible Waitlist Entry atomically', async () => {
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

    await commands.cancel(
      { bookingId: booking.id },
      {
        accountId: fixture.accountId,
        authenticationSessionId: randomUUID(),
        identity: { kind: 'client', clientId: fixture.clientId },
      },
    );

    await expect(
      prisma.booking.findUniqueOrThrow({
        where: { id: booking.id },
        select: { state: true, cancellationCause: true },
      }),
    ).resolves.toEqual({
      state: BookingState.CANCELLED,
      cancellationCause: BookingCancellationCause.CLIENT_REQUEST,
    });
    await expect(
      prisma.subscription.findUniqueOrThrow({
        where: { id: fixture.subscriptionId },
        select: { remainingClassAllowance: true },
      }),
    ).resolves.toEqual({ remainingClassAllowance: 2 });
    await expect(
      prisma.subscription.findUniqueOrThrow({
        where: { id: waitingClient.subscriptionId },
        select: { remainingClassAllowance: true },
      }),
    ).resolves.toEqual({ remainingClassAllowance: 1 });
  });

  it('reschedules a Booking to a same-day Session without changing allowance', async () => {
    // A fixed clock: the rule is "same Bolivia day", so the target Session
    // three hours later must not depend on when the suite runs.
    const now = new Date('2026-09-15T14:00:00.000Z'); // 10:00 in Bolivia
    const fixture = await createFixture(prisma, {
      now,
      startsAt: new Date(now.getTime() + 90 * 60 * 1_000),
    });
    const commands = new PrismaBookingCommands(prisma, () => fixture.now);
    const sourceBooking = await commands.create(
      { sessionId: fixture.sessionId },
      {
        accountId: fixture.accountId,
        authenticationSessionId: randomUUID(),
        identity: { kind: 'client', clientId: fixture.clientId },
      },
    );
    const sourceSession = await prisma.session.findUniqueOrThrow({
      where: { id: fixture.sessionId },
      select: {
        branchId: true,
        classTypeId: true,
        trainerStaffMemberId: true,
      },
    });
    const targetSession = await prisma.session.create({
      data: {
        ...sourceSession,
        startsAt: new Date(now.getTime() + 3 * 60 * 60 * 1_000),
        endsAt: new Date(now.getTime() + 4 * 60 * 60 * 1_000),
        capacity: 8,
      },
    });

    const replacement = await commands.reschedule(
      { bookingId: sourceBooking.id, targetSessionId: targetSession.id },
      {
        accountId: fixture.accountId,
        authenticationSessionId: randomUUID(),
        identity: { kind: 'client', clientId: fixture.clientId },
      },
    );

    await expect(
      prisma.booking.findUniqueOrThrow({
        where: { id: sourceBooking.id },
        select: { state: true, rescheduledToBookingId: true },
      }),
    ).resolves.toEqual({
      state: BookingState.RESCHEDULED,
      rescheduledToBookingId: replacement.id,
    });
    await expect(
      prisma.booking.findUniqueOrThrow({
        where: { id: replacement.id },
        select: { sessionId: true, subscriptionId: true, state: true },
      }),
    ).resolves.toEqual({
      sessionId: targetSession.id,
      subscriptionId: fixture.subscriptionId,
      state: BookingState.BOOKED,
    });
    await expect(
      prisma.subscription.findUniqueOrThrow({
        where: { id: fixture.subscriptionId },
        select: { remainingClassAllowance: true },
      }),
    ).resolves.toEqual({ remainingClassAllowance: 1 });
  });

  it('records a complete Attendance roster after a Session ends', async () => {
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
    const trainerAccount = await prisma.account.create({
      data: {
        email: `${randomUUID()}@example.com`,
        staffMemberId: fixture.trainerId,
      },
    });
    await prisma.session.update({
      where: { id: fixture.sessionId },
      data: {
        startsAt: new Date(fixture.now.getTime() - 2 * 60 * 60 * 1_000),
        endsAt: new Date(fixture.now.getTime() - 60 * 60 * 1_000),
      },
    });

    await commands.recordAttendance(
      {
        sessionId: fixture.sessionId,
        outcomes: [{ bookingId: booking.id, outcome: 'attended' }],
      },
      {
        accountId: trainerAccount.id,
        authenticationSessionId: randomUUID(),
        identity: {
          kind: 'staff',
          staffMemberId: fixture.trainerId,
          role: 'trainer',
          branchIds: [fixture.branchId],
        },
      },
    );

    await expect(
      prisma.attendanceRecord.findUniqueOrThrow({
        where: { bookingId: booking.id },
        select: { outcome: true, recordedByAccountId: true },
      }),
    ).resolves.toEqual({
      outcome: 'ATTENDED',
      recordedByAccountId: trainerAccount.id,
    });
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
        cancelledAt: new Date(),
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
        cancelledAt: new Date(),
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

  it('allocates only one Booking when Clients race for the last Session spot', async () => {
    const fixture = await createFixture(prisma, { capacity: 1 });
    const commands = new PrismaBookingCommands(prisma, () => fixture.now);
    const firstClient = await createClientWithSubscription(prisma);
    const secondClient = await createClientWithSubscription(prisma);

    const results = await Promise.allSettled([
      commands.create(
        { sessionId: fixture.sessionId },
        {
          accountId: firstClient.accountId,
          authenticationSessionId: randomUUID(),
          identity: { kind: 'client', clientId: firstClient.clientId },
        },
      ),
      commands.create(
        { sessionId: fixture.sessionId },
        {
          accountId: secondClient.accountId,
          authenticationSessionId: randomUUID(),
          identity: { kind: 'client', clientId: secondClient.clientId },
        },
      ),
    ]);

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    await expect(
      prisma.booking.count({
        where: { sessionId: fixture.sessionId, state: BookingState.BOOKED },
      }),
    ).resolves.toBe(1);
  });

  it('writes the idempotency records from the injected clock even when it lies far in the past', async () => {
    const pastNow = new Date('2026-09-01T12:00:00.000Z');
    const fixture = await createFixture(prisma, { capacity: 1 });
    const commands = new PrismaBookingCommands(prisma, () => pastNow);
    const bookingKey = randomUUID();
    const waitlistKey = randomUUID();

    await commands.createIdempotent(
      { sessionId: fixture.sessionId },
      {
        accountId: fixture.accountId,
        authenticationSessionId: randomUUID(),
        identity: { kind: 'client', clientId: fixture.clientId },
      },
      bookingKey,
    );
    const waitingClient = await createClientWithSubscription(prisma);
    await commands.joinWaitlistIdempotent(
      { sessionId: fixture.sessionId },
      {
        accountId: waitingClient.accountId,
        authenticationSessionId: randomUUID(),
        identity: { kind: 'client', clientId: waitingClient.clientId },
      },
      waitlistKey,
    );

    await expect(
      prisma.idempotencyRecord.findMany({
        where: { idempotencyKey: { in: [bookingKey, waitlistKey] } },
        select: { command: true, createdAt: true, expiresAt: true },
        orderBy: { command: 'asc' },
      }),
    ).resolves.toEqual([
      {
        command: 'create_booking',
        createdAt: pastNow,
        expiresAt: new Date('2026-09-02T12:00:00.000Z'),
      },
      {
        command: 'join_waitlist',
        createdAt: pastNow,
        expiresAt: new Date('2026-09-02T12:00:00.000Z'),
      },
    ]);
  });
});

const createFixture = async (
  prisma: PrismaClient,
  options: { capacity?: number; startsAt?: Date; now?: Date } = {},
) => {
  const now = options.now ?? new Date();
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
      startsAt:
        options.startsAt ?? new Date(now.getTime() + 4 * 60 * 60 * 1_000),
      endsAt: new Date(
        (
          options.startsAt ?? new Date(now.getTime() + 4 * 60 * 60 * 1_000)
        ).getTime() +
          60 * 60 * 1_000,
      ),
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
    branchId: branch.id,
    trainerId: trainer.id,
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
