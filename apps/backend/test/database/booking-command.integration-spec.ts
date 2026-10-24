import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  BookingCancellationCause,
  BookingState,
  PrismaClient,
} from '../../src/generated/prisma/client';
import { PrismaBookingCommands } from '../../src/booking/commands/prisma-booking-commands';
import {
  bookingClock as clock,
  createClientWithSubscription,
  createFixture,
} from './booking-command-test-support';
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
    const fixture = await createFixture(prisma, { now: clock });
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
    const fixture = await createFixture(prisma, { now: clock });
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

  it('cancels a Booking, restores its allowance, and promotes the oldest eligible Waitlist Entry atomically', async () => {
    const fixture = await createFixture(prisma, { capacity: 1, now: clock });
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
    const fixture = await createFixture(prisma, { now: clock });
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

  it('audits an Attendance correction with the previous outcome and the new one', async () => {
    const fixture = await createFixture(prisma, { now: clock });
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
    const trainer = {
      accountId: trainerAccount.id,
      authenticationSessionId: randomUUID(),
      identity: {
        kind: 'staff' as const,
        staffMemberId: fixture.trainerId,
        role: 'trainer' as const,
        branchIds: [fixture.branchId],
      },
    };
    const roster = (outcome: 'attended' | 'no_show') =>
      commands.recordAttendance(
        {
          sessionId: fixture.sessionId,
          outcomes: [{ bookingId: booking.id, outcome }],
        },
        trainer,
      );

    await roster('attended');
    await roster('no_show');

    const audits = await prisma.auditRecord.findMany({
      where: { actionCode: 'attendance.corrected', targetId: booking.id },
      select: { metadata: true, actorAccountId: true, actorRole: true },
    });
    expect(audits).toEqual([
      {
        actorAccountId: trainerAccount.id,
        actorRole: 'TRAINER',
        metadata: {
          previousOutcome: 'attended',
          outcome: 'no_show',
        },
      },
    ]);
    await expect(
      prisma.attendanceRecord.findUniqueOrThrow({
        where: { bookingId: booking.id },
        select: { outcome: true },
      }),
    ).resolves.toEqual({ outcome: 'NO_SHOW' });
  });

  it('writes the idempotency records from the injected clock even when it lies far in the past', async () => {
    const pastNow = new Date('2026-09-01T12:00:00.000Z');
    const fixture = await createFixture(prisma, { capacity: 1, now: clock });
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
