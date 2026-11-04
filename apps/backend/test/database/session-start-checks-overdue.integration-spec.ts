import {
  hour,
  slotStart,
  startSessionStartChecksWorld,
  type SessionStartChecksWorld,
} from './session-start-checks-test-support';

// Walkthrough 2026-11-04 n.º 2: the worker was down when the 3-hour check
// fell due. When it comes back it settles the missed checks too, even for a
// class that already started or ended, as the check would have on time.
describe('Prisma Session start checks: a missed Minimum Bookings check', () => {
  let world: SessionStartChecksWorld;

  beforeAll(async () => {
    world = await startSessionStartChecksWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  const sessionRow = (id: string) =>
    world.prisma.session.findUniqueOrThrow({ where: { id } });

  it('cancels a class that started below the minimum, returns the class, and tells the Trainer', async () => {
    const startsAt = slotStart(0);
    const booked = await world.createSession(startsAt);
    const empty = await world.createSession(
      new Date(startsAt.getTime() + hour),
    );
    const lucia = await world.principalOf('lucia@example.com');
    const [booking] = await world.book(booked.id, lucia);
    const allowanceAfterBooking = await world.remainingAllowance(lucia);
    const noticesBefore = (
      await world.sessionCancelledNotices(world.trainer.email)
    ).length;
    const back = new Date(startsAt.getTime() + 3 * hour);

    world.setClock(back);
    await expect(world.checks().checkMinimumBookings()).resolves.toEqual({
      checked: 2,
      cancelled: 2,
    });
    for (const id of [booked.id, empty.id]) {
      await expect(sessionRow(id)).resolves.toMatchObject({
        state: 'CANCELLED',
        cancellationCause: 'MINIMUM_NOT_MET',
        cancelledAt: back,
        minimumBookingsCheckCompletedAt: back,
      });
    }
    await expect(
      world.prisma.booking.findUniqueOrThrow({ where: { id: booking.id } }),
    ).resolves.toMatchObject({
      state: 'CANCELLED',
      cancellationCause: 'SESSION_CANCELLED',
    });
    await expect(world.remainingAllowance(lucia)).resolves.toBe(
      allowanceAfterBooking + 1,
    );
    await expect(
      world.sessionCancelledNotices(world.trainer.email),
    ).resolves.toHaveLength(noticesBefore + 2);

    await expect(world.checks().checkMinimumBookings()).resolves.toEqual({
      checked: 0,
      cancelled: 0,
    });
  });

  it('keeps a class that was taught: an attended Booking or the minimum settles the check without cancelling', async () => {
    const startsAt = slotStart(1);
    const attended = await world.createSession(startsAt);
    const full = await world.createSession(new Date(startsAt.getTime() + hour));
    const lucia = await world.principalOf('lucia@example.com');
    const valeria = await world.principalOf('valeria@example.com');
    const [booking] = await world.book(attended.id, lucia);
    await world.book(full.id, lucia, valeria);
    await world.prisma.attendanceRecord.create({
      data: {
        bookingId: booking.id,
        outcome: 'ATTENDED',
        recordedByAccountId: await world.accountIdOf(world.trainer.email),
        recordedAt: new Date(startsAt.getTime() + 5 * 60_000),
      },
    });
    const back = new Date(startsAt.getTime() + 2 * hour);

    world.setClock(back);
    await expect(world.checks().checkMinimumBookings()).resolves.toEqual({
      checked: 2,
      cancelled: 0,
    });
    for (const id of [attended.id, full.id]) {
      await expect(sessionRow(id)).resolves.toMatchObject({
        state: 'SCHEDULED',
        cancellationCause: null,
        minimumBookingsCheckCompletedAt: back,
      });
    }
  });
});
