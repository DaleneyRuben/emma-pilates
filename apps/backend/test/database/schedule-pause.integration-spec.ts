import { AdministrationError } from '../../src/booking/administration/administration-errors';
import { createPrismaScheduleAdministration } from '../../src/booking/administration/prisma-schedule-administration';
import { createPrismaSchedulePauses } from '../../src/booking/administration/prisma-schedule-pauses';
import { createPrismaSessionMaterializer } from '../../src/booking/sessions/prisma-session-materializer';
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
const bolivia = (date: string, time: string) =>
  new Date(`${date}T${time}:00.000-04:00`);
const staff = (key: string) => deterministicId(`staff-member:${key}`);
const centro = deterministicId('branch:centro');
const mat = deterministicId('class-type:mat');
const weekLater = new Date(fixtureNow.getTime() + 7 * 24 * 60 * 60 * 1000);

// BKM-018: pausing a weekly series withdraws its unbooked Sessions on
// [pausedFrom, pausedUntil) and publishes none there; resuming restores the
// ones the pause withdrew that have not started.
describe('Prisma weekly series pause (BKM-018)', () => {
  let world: EvaluationTestWorld;
  const clock = { now: () => fixtureNow };
  const schedules = () =>
    createPrismaScheduleAdministration(world.prisma, clock);
  const pauses = () => createPrismaSchedulePauses(world.prisma, clock);
  const administrator = () => world.principalOf('paola.mendoza@example.com');
  const fridayAt = (startsAtLocal: string) => ({
    branchId: centro,
    classTypeId: mat,
    trainerStaffMemberId: staff('daniela'),
    weekday: 5,
    startsAtLocal,
    durationMinutes: 50,
    capacity: 10,
    effectiveFrom: civil('2026-09-22'),
  });
  const sessionsOf = (sessionScheduleId: string) =>
    world.prisma.session.findMany({
      where: { sessionScheduleId },
      orderBy: { startsAt: 'asc' },
      select: {
        id: true,
        startsAt: true,
        state: true,
        cancellationCause: true,
      },
    });
  const book = async (sessionId: string) => {
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
        sessionId,
        clientId: ana.id,
        subscriptionId: ana.subscriptions[0].id,
        createdByAccountId: ana.account!.id,
      },
    });
  };

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('withdraws the unbooked Sessions of the pause and keeps the booked ones', async () => {
    const admin = await administrator();
    const { schedule } = await schedules().createSchedule(
      fridayAt('12:00'),
      admin,
    );
    const before = await sessionsOf(schedule.id);
    expect(before.map((s) => s.startsAt)).toEqual([
      bolivia('2026-09-25', '12:00'),
      bolivia('2026-10-02', '12:00'),
      bolivia('2026-10-09', '12:00'),
      bolivia('2026-10-16', '12:00'),
    ]);
    await book(before[2].id);

    const result = await pauses().pauseSchedule(
      {
        sessionScheduleId: schedule.id,
        pausedFrom: civil('2026-10-01'),
        pausedUntil: civil('2026-10-16'),
      },
      admin,
    );

    expect(result).toMatchObject({ cancelledSessions: 1, keptSessions: 1 });
    expect(result.schedule.pausedFrom).toEqual(civil('2026-10-01'));
    expect(result.schedule.pausedUntil).toEqual(civil('2026-10-16'));
    expect(
      (await sessionsOf(schedule.id)).map((s) => [
        s.state,
        s.cancellationCause,
      ]),
    ).toEqual([
      ['SCHEDULED', null],
      ['CANCELLED', 'SCHEDULE_PAUSED'],
      ['SCHEDULED', null],
      ['SCHEDULED', null],
    ]);
  });

  it('publishes nothing on the paused dates when the horizon moves on', async () => {
    const admin = await administrator();
    const { schedule } = await schedules().createSchedule(
      fridayAt('14:00'),
      admin,
    );
    await pauses().pauseSchedule(
      {
        sessionScheduleId: schedule.id,
        pausedFrom: civil('2026-10-20'),
        pausedUntil: null,
      },
      admin,
    );

    await createPrismaSessionMaterializer(world.prisma, {
      now: () => weekLater,
    }).materializeSessions();

    expect((await sessionsOf(schedule.id)).map((s) => s.startsAt)).toEqual([
      bolivia('2026-09-25', '14:00'),
      bolivia('2026-10-02', '14:00'),
      bolivia('2026-10-09', '14:00'),
      bolivia('2026-10-16', '14:00'),
    ]);
  });

  it('restores the withdrawn Sessions when the series resumes', async () => {
    const admin = await administrator();
    const { schedule } = await schedules().createSchedule(
      fridayAt('16:00'),
      admin,
    );
    await pauses().pauseSchedule(
      {
        sessionScheduleId: schedule.id,
        pausedFrom: civil('2026-10-01'),
        pausedUntil: null,
      },
      admin,
    );

    const result = await pauses().resumeSchedule(
      { sessionScheduleId: schedule.id },
      admin,
    );

    expect(result).toMatchObject({ restoredSessions: 3 });
    expect(result.schedule.pausedFrom).toBeNull();
    expect(result.schedule.pausedUntil).toBeNull();
    expect(
      (await sessionsOf(schedule.id)).map((s) => [
        s.state,
        s.cancellationCause,
      ]),
    ).toEqual([
      ['SCHEDULED', null],
      ['SCHEDULED', null],
      ['SCHEDULED', null],
      ['SCHEDULED', null],
    ]);
  });

  it('refuses a pause that starts in the past, ends before it starts, or repeats', async () => {
    const admin = await administrator();
    const { schedule } = await schedules().createSchedule(
      fridayAt('18:00'),
      admin,
    );
    const pause = (pausedFrom: string, pausedUntil: string | null) =>
      codeOf(
        pauses().pauseSchedule(
          {
            sessionScheduleId: schedule.id,
            pausedFrom: civil(pausedFrom),
            pausedUntil: pausedUntil === null ? null : civil(pausedUntil),
          },
          admin,
        ),
      );

    await expect(pause('2026-09-20', null)).resolves.toBe(
      'effective_date_invalid',
    );
    await expect(pause('2026-10-09', '2026-10-09')).resolves.toBe(
      'effective_date_invalid',
    );
    await expect(pause('2026-10-09', null)).resolves.toBe('resolved');
    await expect(pause('2026-10-16', null)).resolves.toBe(
      'session_schedule_paused',
    );
  });

  it('refuses to resume a series that is not paused or does not exist', async () => {
    const admin = await administrator();
    const { schedule } = await schedules().createSchedule(
      fridayAt('20:00'),
      admin,
    );

    await expect(
      codeOf(
        pauses().resumeSchedule({ sessionScheduleId: schedule.id }, admin),
      ),
    ).resolves.toBe('session_schedule_not_paused');
    await expect(
      codeOf(
        pauses().resumeSchedule(
          { sessionScheduleId: deterministicId('schedule:none') },
          admin,
        ),
      ),
    ).resolves.toBe('session_schedule_not_found');
  });

  it('refuses a Staff Member who does not run the schedule', async () => {
    await expect(
      codeOf(
        pauses().pauseSchedule(
          {
            sessionScheduleId: deterministicId('schedule:none'),
            pausedFrom: civil('2026-10-09'),
            pausedUntil: null,
          },
          await world.principalOf('camila.rojas@example.com'),
        ),
      ),
    ).resolves.toBe('administration_access_denied');
  });
});
