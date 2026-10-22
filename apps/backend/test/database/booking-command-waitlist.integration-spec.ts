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

describe('Booking commands (Waitlist)', () => {
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

  it('joins a full Session Waitlist without consuming allowance', async () => {
    const fixture = await createFixture(prisma, { capacity: 1, now: clock });
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
    const fixture = await createFixture(prisma, { capacity: 1, now: clock });
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
    const fixture = await createFixture(prisma, { capacity: 1, now: clock });
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

  it('promotes the Waitlist before a direct Booking uses freed capacity', async () => {
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
    const fixture = await createFixture(prisma, { capacity: 1, now: clock });
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
});
