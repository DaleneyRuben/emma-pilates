import {
  minute,
  slotStart,
  startSessionStartChecksWorld,
  type SessionStartChecksWorld,
} from './session-start-checks-test-support';

const window = 150 * minute;

describe('Prisma Session start checks: Bookings at the window close', () => {
  let world: SessionStartChecksWorld;

  beforeAll(async () => {
    world = await startSessionStartChecksWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  const sessionRow = (id: string) =>
    world.prisma.session.findUniqueOrThrow({ where: { id } });

  it('records the live Bookings of every scheduled Session once its Cancellation Window closes, exactly once', async () => {
    const taught = await world.createSession(slotStart(0));
    const empty = await world.createSession(
      new Date(slotStart(0).getTime() + 60 * minute),
    );
    const cancelled = await world.createSession(
      new Date(slotStart(0).getTime() - 70 * minute),
    );
    const lucia = await world.principalOf('lucia@example.com');
    const valeria = await world.principalOf('valeria@example.com');
    const isabel = await world.principalOf('isabel@example.com');
    const [, , third] = await world.book(taught.id, lucia, valeria, isabel);
    await world.bookings.cancel({ bookingId: third.id }, isabel);
    await world.prisma.session.update({
      where: { id: cancelled.id },
      data: {
        state: 'CANCELLED',
        cancellationCause: 'MINIMUM_NOT_MET',
        cancelledAt: new Date(),
      },
    });
    const closes = new Date(taught.startsAt.getTime() - window);

    world.setClock(new Date(closes.getTime() - 1));
    await expect(world.checks().recordWindowCloseBookings()).resolves.toEqual({
      recorded: 0,
    });
    await expect(sessionRow(taught.id)).resolves.toMatchObject({
      bookingsAtWindowClose: null,
    });

    world.setClock(closes);
    await expect(world.checks().recordWindowCloseBookings()).resolves.toEqual({
      recorded: 1,
    });
    await expect(sessionRow(taught.id)).resolves.toMatchObject({
      bookingsAtWindowClose: 2,
    });
    await expect(sessionRow(empty.id)).resolves.toMatchObject({
      bookingsAtWindowClose: null,
    });
    await expect(sessionRow(cancelled.id)).resolves.toMatchObject({
      bookingsAtWindowClose: null,
    });

    // A rerun after a restart, or a Booking lost inside the window, leaves
    // the snapshot alone.
    await world.prisma.booking.updateMany({
      where: { sessionId: taught.id, clientId: valeria.clientId },
      data: {
        state: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledByAccountId: valeria.accountId,
        cancellationCause: 'CLIENT_REQUEST',
      },
    });
    world.setClock(new Date(closes.getTime() + 60 * minute));
    await expect(world.checks().recordWindowCloseBookings()).resolves.toEqual({
      recorded: 1,
    });
    await expect(sessionRow(taught.id)).resolves.toMatchObject({
      bookingsAtWindowClose: 2,
    });
    await expect(sessionRow(empty.id)).resolves.toMatchObject({
      bookingsAtWindowClose: 0,
    });
  });

  it('counts bookings as they stood at the close when the worker runs later', async () => {
    const session = await world.createSession(slotStart(2));
    const lucia = await world.principalOf('lucia@example.com');
    const valeria = await world.principalOf('valeria@example.com');
    await world.book(session.id, lucia, valeria);
    const closes = new Date(session.startsAt.getTime() - window);

    await world.prisma.booking.updateMany({
      where: { sessionId: session.id, clientId: valeria.clientId },
      data: {
        state: 'CANCELLED',
        cancelledAt: new Date(closes.getTime() + minute),
        cancelledByAccountId: valeria.accountId,
        cancellationCause: 'CLIENT_REQUEST',
      },
    });
    world.setClock(new Date(closes.getTime() + 30 * minute));

    await expect(world.checks().recordWindowCloseBookings()).resolves.toEqual({
      recorded: 1,
    });
    await expect(sessionRow(session.id)).resolves.toMatchObject({
      bookingsAtWindowClose: 2,
    });
  });

  it('reads the Cancellation Window from Studio Settings', async () => {
    const session = await world.createSession(slotStart(1));
    await world.setStudioSettings({ cancellationWindowMinutes: 60 });

    try {
      world.setClock(new Date(session.startsAt.getTime() - window));
      await expect(world.checks().recordWindowCloseBookings()).resolves.toEqual(
        { recorded: 0 },
      );

      world.setClock(new Date(session.startsAt.getTime() - 60 * minute));
      await expect(world.checks().recordWindowCloseBookings()).resolves.toEqual(
        { recorded: 1 },
      );
      await expect(sessionRow(session.id)).resolves.toMatchObject({
        bookingsAtWindowClose: 0,
      });
    } finally {
      await world.setStudioSettings({ cancellationWindowMinutes: 150 });
    }
  });
});
