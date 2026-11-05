import {
  hour,
  slotStart,
  startSessionStartChecksWorld,
  type SessionStartChecksWorld,
} from './session-start-checks-test-support';

// Walkthrough 2026-11-04 n.º 2: the worker was down when the 3-hour check
// fell due. When it comes back it settles the missed checks too, even for a
// class that already started or ended (decision §19.19).
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

  it('cancels a class that started with nobody booked, without notices', async () => {
    const startsAt = slotStart(0);
    const empty = await world.createSession(startsAt);
    const later = await world.createSession(
      new Date(startsAt.getTime() + hour),
    );
    const noticesBefore = (
      await world.sessionCancelledNotices(world.trainer.email)
    ).length;
    const back = new Date(startsAt.getTime() + 3 * hour);

    world.setClock(back);
    await expect(world.checks().checkMinimumBookings()).resolves.toEqual({
      checked: 2,
      cancelled: 2,
    });
    for (const id of [empty.id, later.id]) {
      await expect(sessionRow(id)).resolves.toMatchObject({
        state: 'CANCELLED',
        cancellationCause: 'MINIMUM_NOT_MET',
        cancelledAt: back,
        minimumBookingsCheckCompletedAt: back,
      });
    }
    // Nobody is affected by a class that is over: no one is told.
    await expect(
      world.sessionCancelledNotices(world.trainer.email),
    ).resolves.toHaveLength(noticesBefore);

    await expect(world.checks().checkMinimumBookings()).resolves.toEqual({
      checked: 0,
      cancelled: 0,
    });
  });

  // Review of FIX-033: a worker restart a few minutes into a class must not
  // cancel it under a Client in the room; attendance is marked later.
  it('keeps a started class with a Booking below the minimum, attended or not', async () => {
    const startsAt = slotStart(1);
    const booked = await world.createSession(startsAt);
    const full = await world.createSession(new Date(startsAt.getTime() + hour));
    const lucia = await world.principalOf('lucia@example.com');
    const valeria = await world.principalOf('valeria@example.com');
    const [booking] = await world.book(booked.id, lucia);
    await world.book(full.id, lucia, valeria);
    const allowanceAfterBooking = await world.remainingAllowance(lucia);
    const back = new Date(full.startsAt.getTime() + 2 * 60_000);

    world.setClock(back);
    await expect(world.checks().checkMinimumBookings()).resolves.toEqual({
      checked: 2,
      cancelled: 0,
    });
    for (const id of [booked.id, full.id]) {
      await expect(sessionRow(id)).resolves.toMatchObject({
        state: 'SCHEDULED',
        cancellationCause: null,
        minimumBookingsCheckCompletedAt: back,
      });
    }
    await expect(
      world.prisma.booking.findUniqueOrThrow({ where: { id: booking.id } }),
    ).resolves.toMatchObject({ state: 'BOOKED' });
    await expect(world.remainingAllowance(lucia)).resolves.toBe(
      allowanceAfterBooking,
    );
  });
});
