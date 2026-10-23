import { AdministrationError } from '../../src/booking/administration/administration-errors';
import { createPrismaScheduleAdministration } from '../../src/booking/administration/prisma-schedule-administration';
import { deterministicId } from '../../src/development-fixtures/deterministic-id';
import {
  fixtureNow,
  startEvaluationTestWorld,
  type EvaluationTestWorld,
} from './evaluation-test-support';

const codeOf = async (work: Promise<unknown>): Promise<string> => {
  try {
    await work;
    return 'resolved';
  } catch (error) {
    if (error instanceof AdministrationError) return error.code;
    return String(error);
  }
};

const civil = (date: string) => new Date(`${date}T00:00:00.000Z`);
// Bolivia wall clock on a civil date, as an instant.
const bolivia = (date: string, time: string) =>
  new Date(`${date}T${time}:00.000-04:00`);
const staff = (key: string) => deterministicId(`staff-member:${key}`);
const centro = deterministicId('branch:centro');
const mat = deterministicId('class-type:mat');

describe('Prisma schedule administration', () => {
  let world: EvaluationTestWorld;
  const schedules = () =>
    createPrismaScheduleAdministration(world.prisma, { now: () => fixtureNow });
  const administrator = () => world.principalOf('paola.mendoza@example.com');

  const wednesdayNoon = {
    branchId: centro,
    classTypeId: mat,
    trainerStaffMemberId: staff('daniela'),
    weekday: 3,
    startsAtLocal: '12:00',
    durationMinutes: 50,
    capacity: 10,
  };

  const sessionsOf = (sessionScheduleId: string) =>
    world.prisma.session.findMany({
      where: { sessionScheduleId },
      orderBy: { startsAt: 'asc' },
      select: {
        id: true,
        startsAt: true,
        state: true,
        cancellationCause: true,
        cancelledByAccountId: true,
      },
    });

  let firstScheduleId: string;

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('creates a weekly schedule from a future date and materializes its Sessions at once', async () => {
    const result = await schedules().createSchedule(
      { ...wednesdayNoon, effectiveFrom: civil('2026-09-22') },
      await administrator(),
    );

    firstScheduleId = result.schedule.id;
    expect(result).toMatchObject({ created: 5, skipped: 0 });
    expect((await sessionsOf(firstScheduleId)).map((s) => s.startsAt)).toEqual([
      bolivia('2026-09-23', '12:00'),
      bolivia('2026-09-30', '12:00'),
      bolivia('2026-10-07', '12:00'),
      bolivia('2026-10-14', '12:00'),
      bolivia('2026-10-21', '12:00'),
    ]);
  });

  it('refuses unassigned Trainers, past dates, and non-Administrators', async () => {
    await expect(
      codeOf(
        schedules().createSchedule(
          {
            ...wednesdayNoon,
            trainerStaffMemberId: staff('andrea'),
            effectiveFrom: civil('2026-09-22'),
          },
          await administrator(),
        ),
      ),
    ).resolves.toBe('trainer_not_assignable');
    await expect(
      codeOf(
        schedules().createSchedule(
          { ...wednesdayNoon, weekday: 6, effectiveFrom: civil('2026-09-01') },
          await administrator(),
        ),
      ),
    ).resolves.toBe('effective_date_invalid');
    await expect(
      codeOf(
        schedules().createSchedule(
          { ...wednesdayNoon, weekday: 6, effectiveFrom: civil('2026-09-22') },
          await world.principalOf('camila.rojas@example.com'),
        ),
      ),
    ).resolves.toBe('administration_access_denied');
  });

  it('replaces a schedule from a date, cancelling only its unbooked Sessions and keeping booked ones', async () => {
    const [, , , booked] = await sessionsOf(firstScheduleId);
    const ana = await world.prisma.client.findUniqueOrThrow({
      where: { id: deterministicId('test-client:ana') },
      select: {
        id: true,
        subscriptions: { select: { id: true } },
        account: { select: { id: true } },
      },
    });
    await world.prisma.booking.create({
      data: {
        sessionId: booked.id,
        clientId: ana.id,
        subscriptionId: ana.subscriptions[0].id,
        createdByAccountId: ana.account!.id,
      },
    });
    const admin = await administrator();

    const result = await schedules().replaceSchedule(
      {
        sessionScheduleId: firstScheduleId,
        ...wednesdayNoon,
        startsAtLocal: '12:30',
        effectiveFrom: civil('2026-10-07'),
      },
      admin,
    );

    expect(result).toMatchObject({
      cancelledSessions: 2,
      keptSessions: 1,
      created: 2,
      skipped: 1,
    });
    expect(result.ended.effectiveUntil).toEqual(civil('2026-10-07'));
    const old = await sessionsOf(firstScheduleId);
    expect(old.map((s) => [s.startsAt, s.state, s.cancellationCause])).toEqual([
      [bolivia('2026-09-23', '12:00'), 'SCHEDULED', null],
      [bolivia('2026-09-30', '12:00'), 'SCHEDULED', null],
      [bolivia('2026-10-07', '12:00'), 'CANCELLED', 'SCHEDULE_CHANGED'],
      [bolivia('2026-10-14', '12:00'), 'SCHEDULED', null],
      [bolivia('2026-10-21', '12:00'), 'CANCELLED', 'SCHEDULE_CHANGED'],
    ]);
    expect(old[2].cancelledByAccountId).toBe(admin.accountId);
    expect(
      (await sessionsOf(result.replacement.id)).map((s) => s.startsAt),
    ).toEqual([bolivia('2026-10-07', '12:30'), bolivia('2026-10-21', '12:30')]);

    const ended = await schedules().endSchedule(
      {
        sessionScheduleId: result.replacement.id,
        effectiveFrom: civil('2026-10-21'),
      },
      admin,
    );
    expect(ended).toMatchObject({ cancelledSessions: 1, keptSessions: 0 });
  });

  it('edits one Session as an exception: moves it, clears the empty check, swaps the Trainer, and notifies', async () => {
    const [, , , booked] = await sessionsOf(firstScheduleId);
    await world.prisma.session.update({
      where: { id: booked.id },
      data: { emptyBookingCheckCompletedAt: fixtureNow },
    });

    const moved = await schedules().updateSession(
      {
        sessionId: booked.id,
        startsAt: bolivia('2026-10-14', '14:00'),
        trainerStaffMemberId: staff('emma'),
      },
      await administrator(),
    );

    expect(moved).toMatchObject({
      startsAt: bolivia('2026-10-14', '14:00'),
      endsAt: bolivia('2026-10-14', '14:50'),
      trainerStaffMemberId: staff('emma'),
      isException: true,
    });
    const stored = await world.prisma.session.findUniqueOrThrow({
      where: { id: booked.id },
    });
    expect(stored.emptyBookingCheckCompletedAt).toBeNull();
    expect(stored.occurrenceStartsAt).toEqual(bolivia('2026-10-14', '12:00'));
    const notices = await world.prisma.notification.findMany({
      where: { businessEventKey: { contains: booked.id } },
      select: { type: true, destinationType: true },
    });
    expect(notices).toEqual(
      expect.arrayContaining([
        { type: 'session_assigned', destinationType: 'trainer_schedule' },
        { type: 'session_rescheduled_by_studio', destinationType: 'booking' },
      ]),
    );
    await expect(
      world.prisma.auditRecord.count({
        where: { actionCode: 'session.updated', targetId: booked.id },
      }),
    ).resolves.toBe(1);

    await expect(
      codeOf(
        schedules().updateSession(
          { sessionId: booked.id, capacity: 0 },
          await administrator(),
        ),
      ),
    ).resolves.toBe('capacity_below_bookings');
    await expect(
      codeOf(
        schedules().updateSession(
          { sessionId: booked.id, startsAt: bolivia('2026-10-14', '07:00') },
          await administrator(),
        ),
      ),
    ).resolves.toBe('session_overlap');
  });

  it('promotes the Waitlist in queue order when an Administrator raises capacity', async () => {
    const session = await schedules().createSession(
      {
        branchId: centro,
        classTypeId: mat,
        trainerStaffMemberId: staff('daniela'),
        startsAt: bolivia('2026-09-26', '18:00'),
        durationMinutes: 50,
        capacity: 1,
      },
      await administrator(),
    );
    const [ana, bea] = await Promise.all(
      (['ana', 'bea'] as const).map((key) =>
        world.prisma.client.findUniqueOrThrow({
          where: { id: deterministicId(`test-client:${key}`) },
          select: {
            id: true,
            subscriptions: { select: { id: true } },
            account: { select: { id: true } },
          },
        }),
      ),
    );
    await world.prisma.booking.create({
      data: {
        sessionId: session.id,
        clientId: ana.id,
        subscriptionId: ana.subscriptions[0].id,
        createdByAccountId: ana.account!.id,
      },
    });
    const earlier = await world.prisma.waitlistEntry.create({
      data: {
        sessionId: session.id,
        clientId: bea.id,
        joinedByAccountId: bea.account!.id,
        joinedAt: new Date('2026-09-21T16:00:00.000Z'),
      },
    });
    const waiting = await world.prisma.client.create({
      data: {
        name: 'Waiting Client',
        referralCode: 'REF-WAITING-CAPACITY',
        account: {
          create: { email: 'waiting-capacity@example.com' },
        },
      },
      select: { id: true, account: { select: { id: true } } },
    });
    const later = await world.prisma.waitlistEntry.create({
      data: {
        sessionId: session.id,
        clientId: waiting.id,
        joinedByAccountId: waiting.account!.id,
        joinedAt: new Date('2026-09-21T17:00:00.000Z'),
      },
    });

    await schedules().updateSession(
      { sessionId: session.id, capacity: 2 },
      await administrator(),
    );

    const promoted = await world.prisma.waitlistEntry.findUniqueOrThrow({
      where: { id: earlier.id },
      select: { closureReason: true, promotedBookingId: true },
    });
    const stillWaiting = await world.prisma.waitlistEntry.findUniqueOrThrow({
      where: { id: later.id },
      select: { closedAt: true },
    });
    expect(promoted.closureReason).toBe('PROMOTED');
    expect(promoted.promotedBookingId).toEqual(expect.any(String));
    expect(stillWaiting.closedAt).toBeNull();
    await expect(
      world.prisma.booking.count({
        where: { sessionId: session.id, state: 'BOOKED', clientId: bea.id },
      }),
    ).resolves.toBe(1);
  });

  it('creates a one-off Session for the minutes given', async () => {
    const session = await schedules().createSession(
      {
        branchId: centro,
        classTypeId: mat,
        trainerStaffMemberId: staff('daniela'),
        startsAt: bolivia('2026-09-26', '15:00'),
        durationMinutes: 50,
        capacity: 8,
      },
      await administrator(),
    );

    expect(session).toMatchObject({
      endsAt: bolivia('2026-09-26', '15:50'),
      isException: true,
      sessionScheduleId: null,
      capacity: 8,
    });
    await expect(
      world.prisma.auditRecord.findFirst({
        where: { targetId: session.id, actionCode: 'session.created' },
        select: {
          actorRole: true,
          targetType: true,
          branchId: true,
          metadata: true,
        },
      }),
    ).resolves.toEqual({
      actorRole: 'ADMINISTRATOR',
      targetType: 'session',
      branchId: centro,
      metadata: {
        classTypeId: mat,
        trainerStaffMemberId: staff('daniela'),
        startsAt: bolivia('2026-09-26', '15:00').toISOString(),
        durationMinutes: 50,
        capacity: 8,
      },
    });
  });
});
