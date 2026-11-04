import { AdministrationError } from '../../src/booking/administration/administration-errors';
import { createPrismaScheduleAdministration } from '../../src/booking/administration/prisma-schedule-administration';
import { createPrismaScheduleBatch } from '../../src/booking/administration/prisma-schedule-batch';
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

// BKM-018: «Vigente hasta» is an optional exclusive end on a weekly series,
// set when it is created or replaced; without one the series has no end.
describe('Prisma weekly schedule end date (BKM-018)', () => {
  let world: EvaluationTestWorld;
  const schedules = () =>
    createPrismaScheduleAdministration(world.prisma, { now: () => fixtureNow });
  const batch = () =>
    createPrismaScheduleBatch(world.prisma, { now: () => fixtureNow });
  const administrator = () => world.principalOf('paola.mendoza@example.com');
  const thursdayNoon = {
    branchId: centro,
    classTypeId: mat,
    trainerStaffMemberId: staff('daniela'),
    weekday: 4,
    startsAtLocal: '12:00',
    durationMinutes: 50,
    capacity: 10,
  };
  const startsOf = async (sessionScheduleId: string) =>
    (
      await world.prisma.session.findMany({
        where: { sessionScheduleId, state: 'SCHEDULED' },
        orderBy: { startsAt: 'asc' },
        select: { startsAt: true },
      })
    ).map(({ startsAt }) => startsAt);

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('creates a series that stops before its «Vigente hasta»', async () => {
    const result = await schedules().createSchedule(
      {
        ...thursdayNoon,
        effectiveFrom: civil('2026-09-22'),
        effectiveUntil: civil('2026-10-08'),
      },
      await administrator(),
    );

    expect(result.schedule.effectiveUntil).toEqual(civil('2026-10-08'));
    expect(await startsOf(result.schedule.id)).toEqual([
      bolivia('2026-09-24', '12:00'),
      bolivia('2026-10-01', '12:00'),
    ]);
  });

  it('refuses an end on or before the start', async () => {
    await expect(
      codeOf(
        schedules().createSchedule(
          {
            ...thursdayNoon,
            startsAtLocal: '14:00',
            effectiveFrom: civil('2026-09-22'),
            effectiveUntil: civil('2026-09-22'),
          },
          await administrator(),
        ),
      ),
    ).resolves.toBe('effective_date_invalid');
  });

  it('gives every row of a batch the same end', async () => {
    const result = await batch().createSchedules(
      {
        branchId: centro,
        classTypeId: mat,
        trainerStaffMemberId: staff('daniela'),
        capacity: 10,
        effectiveFrom: civil('2026-09-22'),
        effectiveUntil: civil('2026-10-01'),
        rows: [
          { weekday: 2, startsAtLocal: '06:00', durationMinutes: 50 },
          { weekday: 5, startsAtLocal: '06:00', durationMinutes: 50 },
        ],
      },
      await administrator(),
    );

    expect(
      result.schedules.map(({ schedule }) => schedule.effectiveUntil),
    ).toEqual([civil('2026-10-01'), civil('2026-10-01')]);
    expect(await startsOf(result.schedules[0].schedule.id)).toEqual([
      bolivia('2026-09-22', '06:00'),
      bolivia('2026-09-29', '06:00'),
    ]);
  });

  it('sets, keeps or removes the end when the series is replaced', async () => {
    const admin = await administrator();
    const { schedule } = await schedules().createSchedule(
      {
        ...thursdayNoon,
        startsAtLocal: '16:00',
        effectiveFrom: civil('2026-09-22'),
        effectiveUntil: civil('2026-10-22'),
      },
      admin,
    );

    const kept = await schedules().replaceSchedule(
      {
        ...thursdayNoon,
        startsAtLocal: '16:00',
        capacity: 12,
        sessionScheduleId: schedule.id,
        effectiveFrom: civil('2026-10-01'),
      },
      admin,
    );
    expect(kept.replacement.effectiveUntil).toEqual(civil('2026-10-22'));

    const opened = await schedules().replaceSchedule(
      {
        ...thursdayNoon,
        startsAtLocal: '16:00',
        sessionScheduleId: kept.replacement.id,
        effectiveFrom: civil('2026-10-08'),
        effectiveUntil: null,
      },
      admin,
    );
    expect(opened.replacement.effectiveUntil).toBeNull();

    await expect(
      codeOf(
        schedules().replaceSchedule(
          {
            ...thursdayNoon,
            startsAtLocal: '16:00',
            sessionScheduleId: opened.replacement.id,
            effectiveFrom: civil('2026-10-15'),
            effectiveUntil: civil('2026-10-15'),
          },
          admin,
        ),
      ),
    ).resolves.toBe('effective_date_invalid');
  });
});
