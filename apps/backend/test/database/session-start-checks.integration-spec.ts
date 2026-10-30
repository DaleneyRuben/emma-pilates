import { Prisma } from '../../src/generated/prisma/client';
import { recordNotification } from '../../src/notifications/prisma-notification-store';
import { boliviaDate } from '../../src/time/bolivia-time';
import {
  hour,
  minute,
  slotStart,
  startSessionStartChecksWorld,
  type SessionStartChecksWorld,
} from './session-start-checks-test-support';

const lead = 3 * hour;

describe('Prisma Session start checks: Minimum Bookings', () => {
  let world: SessionStartChecksWorld;

  beforeAll(async () => {
    world = await startSessionStartChecksWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  const sessionRow = (id: string) =>
    world.prisma.session.findUniqueOrThrow({ where: { id } });

  it('cancels a Session with 1 Booking at the 3-hour check, returns the class, closes the Waitlist, and notifies everyone once', async () => {
    const startsAt = slotStart(0);
    const session = await world.createSession(startsAt);
    const later = await world.createSession(
      new Date(startsAt.getTime() + hour),
    );
    const full = await world.createSession(
      new Date(startsAt.getTime() + 2 * hour),
      1,
    );
    const lucia = await world.principalOf('lucia@example.com');
    const valeria = await world.principalOf('valeria@example.com');
    const isabel = await world.principalOf('isabel@example.com');
    const [booking] = await world.book(session.id, lucia);
    await world.book(full.id, valeria);
    const entry = await world.joinWaitlist(session.id, isabel);
    const allowanceAfterBooking = await world.remainingAllowance(lucia);
    const due = new Date(startsAt.getTime() - lead);

    world.setClock(new Date(due.getTime() - 1));
    await expect(world.checks().checkMinimumBookings()).resolves.toEqual({
      checked: 0,
      cancelled: 0,
    });

    world.setClock(due);
    await expect(world.checks().checkMinimumBookings()).resolves.toEqual({
      checked: 1,
      cancelled: 1,
    });
    await expect(sessionRow(session.id)).resolves.toMatchObject({
      state: 'CANCELLED',
      cancellationCause: 'MINIMUM_NOT_MET',
      cancelledAt: due,
      cancelledByAccountId: null,
      minimumBookingsCheckCompletedAt: due,
    });
    await expect(
      world.prisma.booking.findUniqueOrThrow({ where: { id: booking.id } }),
    ).resolves.toMatchObject({
      state: 'CANCELLED',
      cancellationCause: 'SESSION_CANCELLED',
      cancelledAt: due,
      cancelledByAccountId: null,
    });
    await expect(world.remainingAllowance(lucia)).resolves.toBe(
      allowanceAfterBooking + 1,
    );
    await expect(
      world.prisma.waitlistEntry.findUniqueOrThrow({ where: { id: entry.id } }),
    ).resolves.toMatchObject({
      closedAt: due,
      closureReason: 'SESSION_CANCELLED',
    });

    const [clientNotice, ...otherClientNotices] =
      await world.sessionCancelledNotices('lucia@example.com');
    expect(otherClientNotices).toEqual([]);
    expect(clientNotice).toMatchObject({
      category: 'BOOKING_SCHEDULE',
      title: 'Clase cancelada',
      destinationType: 'session',
      destinationId: session.id,
    });
    expect(clientNotice.message).toMatch(
      new RegExp(
        `^Tu clase de ${world.classType.name} .+ se canceló porque no llegó al mínimo de reservas\\. Te devolvimos la clase a tu plan\\. `,
      ),
    );
    // The later Session has places; the full one does not.
    const laterTime = new Intl.DateTimeFormat('es-BO', {
      timeZone: 'America/La_Paz',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(later.startsAt);
    if (
      boliviaDate(later.startsAt).getTime() === boliviaDate(startsAt).getTime()
    ) {
      expect(clientNotice.message).toMatch(
        new RegExp(`hay lugar en ${world.classType.name} ${laterTime}\\.$`),
      );
    } else {
      expect(clientNotice.message).toMatch(
        /ya no quedan otras clases con lugar\.$/,
      );
    }

    const [trainerNotice, ...otherTrainerNotices] =
      await world.sessionCancelledNotices(world.trainer.email);
    expect(otherTrainerNotices).toEqual([]);
    expect(trainerNotice).toMatchObject({
      destinationType: 'trainer_schedule',
      destinationId: null,
    });
    expect(trainerNotice.message).toMatch(
      /se canceló: no llegó al mínimo de 2 reservas\.$/,
    );
    await expect(
      world.sessionCancelledNotices('isabel@example.com'),
    ).resolves.toEqual([
      expect.objectContaining({
        message: `La clase de ${world.classType.name} a la que estabas en lista de espera fue cancelada.`,
      }),
    ]);

    world.setClock(new Date(due.getTime() + minute));
    await expect(world.checks().checkMinimumBookings()).resolves.toEqual({
      checked: 0,
      cancelled: 0,
    });
    await expect(world.remainingAllowance(lucia)).resolves.toBe(
      allowanceAfterBooking + 1,
    );
    await expect(
      world.sessionCancelledNotices(world.trainer.email),
    ).resolves.toHaveLength(1);
    // Keep the other two Sessions out of the later slots' checks.
    await world.prisma.session.updateMany({
      where: { id: { in: [later.id, full.id] } },
      data: { minimumBookingsCheckCompletedAt: due },
    });
  });

  it('teaches a Session with 2 Bookings and never re-checks it after they drop', async () => {
    const startsAt = slotStart(1);
    const session = await world.createSession(startsAt);
    const lucia = await world.principalOf('lucia@example.com');
    const valeria = await world.principalOf('valeria@example.com');
    const [first] = await world.book(session.id, lucia, valeria);
    const due = new Date(startsAt.getTime() - lead);
    const noticesBefore = (
      await world.sessionCancelledNotices(world.trainer.email)
    ).length;

    world.setClock(due);
    await expect(world.checks().checkMinimumBookings()).resolves.toEqual({
      checked: 1,
      cancelled: 0,
    });
    await expect(sessionRow(session.id)).resolves.toMatchObject({
      state: 'SCHEDULED',
      cancellationCause: null,
      minimumBookingsCheckCompletedAt: due,
    });

    await world.bookings.cancel({ bookingId: first.id }, lucia);
    world.setClock(new Date(due.getTime() + 10 * minute));
    await expect(world.checks().checkMinimumBookings()).resolves.toEqual({
      checked: 0,
      cancelled: 0,
    });
    await expect(sessionRow(session.id)).resolves.toMatchObject({
      state: 'SCHEDULED',
    });
    await expect(
      world.sessionCancelledNotices(world.trainer.email),
    ).resolves.toHaveLength(noticesBefore);
  });

  it('finishes the remaining Sessions after a restart in the middle of a check, without repeating the settled one', async () => {
    const firstStart = slotStart(2);
    const first = await world.createSession(firstStart);
    const second = await world.createSession(
      new Date(firstStart.getTime() + hour),
    );
    const lucia = await world.principalOf('lucia@example.com');
    const valeria = await world.principalOf('valeria@example.com');
    await world.book(first.id, lucia);
    await world.book(second.id, valeria);
    const luciaAllowance = await world.remainingAllowance(lucia);
    const valeriaAllowance = await world.remainingAllowance(valeria);
    const luciaNoticesBefore = (
      await world.sessionCancelledNotices('lucia@example.com')
    ).length;
    // The worker dies while settling the second Session: its transaction
    // rolls back, the first one stays committed.
    let crashed = false;
    const crashOnSecond = async (
      ...[transaction, notice]: Parameters<typeof recordNotification>
    ) => {
      if (!crashed && notice.businessEventKey.endsWith(second.id)) {
        crashed = true;
        throw new Error('worker stopped');
      }
      await recordNotification(transaction, notice);
    };

    world.setClock(new Date(second.startsAt.getTime() - lead));
    await expect(
      world.checks(crashOnSecond).checkMinimumBookings(),
    ).rejects.toThrow(`minimum_bookings_check failed for 1 item: ${second.id}`);
    await expect(sessionRow(first.id)).resolves.toMatchObject({
      state: 'CANCELLED',
    });
    await expect(sessionRow(second.id)).resolves.toMatchObject({
      state: 'SCHEDULED',
      minimumBookingsCheckCompletedAt: null,
    });

    await expect(world.checks().checkMinimumBookings()).resolves.toEqual({
      checked: 1,
      cancelled: 1,
    });
    await expect(sessionRow(second.id)).resolves.toMatchObject({
      state: 'CANCELLED',
      cancellationCause: 'MINIMUM_NOT_MET',
    });
    await expect(world.remainingAllowance(lucia)).resolves.toBe(
      luciaAllowance + 1,
    );
    await expect(world.remainingAllowance(valeria)).resolves.toBe(
      valeriaAllowance + 1,
    );
    await expect(
      world.sessionCancelledNotices('lucia@example.com'),
    ).resolves.toHaveLength(luciaNoticesBefore + 1);
  });

  it('ignores a Session an Administrator already cancelled', async () => {
    const session = await world.createSession(slotStart(3));
    await world.prisma.session.update({
      where: { id: session.id },
      data: {
        state: 'CANCELLED',
        cancellationCause: 'NO_SUBSTITUTE_TRAINER',
        cancelledAt: new Date(),
        cancelledByAccountId: await world.accountIdOf(
          'paola.mendoza@example.com',
        ),
      },
    });

    world.setClock(new Date(session.startsAt.getTime() - lead));
    await expect(world.checks().checkMinimumBookings()).resolves.toEqual({
      checked: 0,
      cancelled: 0,
    });
    await expect(sessionRow(session.id)).resolves.toMatchObject({
      cancellationCause: 'NO_SUBSTITUTE_TRAINER',
      minimumBookingsCheckCompletedAt: null,
    });
  });

  it('never cancels a Session under a Booking that lands during the check', async () => {
    const session = await world.createSession(slotStart(4));
    const lucia = await world.principalOf('lucia@example.com');
    const valeria = await world.principalOf('valeria@example.com');
    await world.book(session.id, lucia);
    let landed: PromiseSettledResult<{ id: string }> | undefined;
    // The Booking commits while the check holds the Session row and has
    // already decided to cancel. Booking's foreign key check must not wait on
    // that lock, or this would deadlock instead of retrying.
    const bookDuringCheck = async (
      ...[transaction, notice]: Parameters<typeof recordNotification>
    ) => {
      if (landed === undefined) {
        [landed] = await Promise.allSettled([
          world.bookings.create({ sessionId: session.id }, valeria),
        ]);
      }
      await recordNotification(transaction, notice);
    };

    world.setClock(new Date(session.startsAt.getTime() - lead));
    await world.checks(bookDuringCheck).checkMinimumBookings();

    const after = await world.prisma.session.findUniqueOrThrow({
      where: { id: session.id },
      include: { bookings: { where: { state: 'BOOKED' } } },
    });
    expect(landed).toBeDefined();
    if (landed!.status === 'fulfilled') {
      expect(after).toMatchObject({ state: 'SCHEDULED' });
      expect(after.bookings).toHaveLength(2);
    } else {
      expect(after).toMatchObject({ cancellationCause: 'MINIMUM_NOT_MET' });
      expect(after.bookings).toEqual([]);
    }
  });

  it('cancels and notifies once when two workers check the same Session concurrently', async () => {
    const session = await world.createSession(slotStart(5));
    const noticesBefore = (
      await world.sessionCancelledNotices(world.trainer.email)
    ).length;

    world.setClock(new Date(session.startsAt.getTime() - lead));
    const results = await Promise.all([
      world.checks().checkMinimumBookings(),
      world.checks().checkMinimumBookings(),
    ]);

    expect(results.reduce((sum, result) => sum + result.cancelled, 0)).toBe(1);
    await expect(
      world.sessionCancelledNotices(world.trainer.email),
    ).resolves.toHaveLength(noticesBefore + 1);
  });

  it('applies a minimum changed in Studio Settings at the next check', async () => {
    const session = await world.createSession(slotStart(6));
    const lucia = await world.principalOf('lucia@example.com');
    const valeria = await world.principalOf('valeria@example.com');
    await world.book(session.id, lucia, valeria);
    await world.setStudioSettings({ minimumBookings: 3 });

    try {
      world.setClock(new Date(session.startsAt.getTime() - lead));
      await expect(world.checks().checkMinimumBookings()).resolves.toEqual({
        checked: 1,
        cancelled: 1,
      });
      await expect(sessionRow(session.id)).resolves.toMatchObject({
        cancellationCause: 'MINIMUM_NOT_MET',
      });
      const notices = await world.sessionCancelledNotices(world.trainer.email);
      expect(notices.at(-1)!.message).toMatch(
        /no llegó al mínimo de 3 reservas\.$/,
      );
    } finally {
      await world.setStudioSettings({ minimumBookings: 2 });
    }
  });

  it('settles the later Sessions when one throws, even a database error, then reports it', async () => {
    const first = await world.createSession(slotStart(8));
    const broken = await world.createSession(
      new Date(slotStart(8).getTime() + hour),
    );
    const later = await world.createSession(
      new Date(slotStart(8).getTime() + 2 * hour),
    );
    const lucia = await world.principalOf('lucia@example.com');
    await world.book(first.id, lucia);
    const failTheMiddle = async (
      ...[transaction, notice]: Parameters<typeof recordNotification>
    ) => {
      if (notice.businessEventKey.endsWith(broken.id)) {
        throw new Prisma.PrismaClientKnownRequestError('session broke', {
          code: 'P2010',
          clientVersion: 'test',
        });
      }
      await recordNotification(transaction, notice);
    };
    // All three sit inside the lead window only once the latest is due.
    // A clock at the first Session's lead leaves the later two for a future sweep.
    const due = new Date(later.startsAt.getTime() - lead);
    world.setClock(due);

    await expect(
      world.checks(failTheMiddle).checkMinimumBookings(),
    ).rejects.toThrow(`minimum_bookings_check failed for 1 item: ${broken.id}`);
    await expect(sessionRow(first.id)).resolves.toMatchObject({
      state: 'CANCELLED',
    });
    await expect(sessionRow(broken.id)).resolves.toMatchObject({
      state: 'SCHEDULED',
      minimumBookingsCheckCompletedAt: null,
    });
    await expect(sessionRow(later.id)).resolves.toMatchObject({
      state: 'CANCELLED',
    });
  });

  it('closes open Waitlist Entries as session_started once the Session starts, without a notice, exactly once', async () => {
    const session = await world.createSession(slotStart(7), 1);
    const lucia = await world.principalOf('lucia@example.com');
    const valeria = await world.principalOf('valeria@example.com');
    await world.book(session.id, lucia);
    const entry = await world.joinWaitlist(session.id, valeria);
    const valeriaNotices = () =>
      world.prisma.notification.count({
        where: { accountId: valeria.accountId },
      });
    const noticesBefore = await valeriaNotices();

    world.setClock(new Date(session.startsAt.getTime() - 1));
    await expect(world.checks().closeStartedWaitlists()).resolves.toEqual({
      closed: 0,
    });

    world.setClock(session.startsAt);
    await expect(world.checks().closeStartedWaitlists()).resolves.toEqual({
      closed: 1,
    });
    await expect(
      world.prisma.waitlistEntry.findUniqueOrThrow({ where: { id: entry.id } }),
    ).resolves.toMatchObject({
      closedAt: session.startsAt,
      closureReason: 'SESSION_STARTED',
      promotedBookingId: null,
    });
    await expect(valeriaNotices()).resolves.toBe(noticesBefore);

    world.setClock(new Date(session.startsAt.getTime() + minute));
    await expect(world.checks().closeStartedWaitlists()).resolves.toEqual({
      closed: 0,
    });
  });
});
