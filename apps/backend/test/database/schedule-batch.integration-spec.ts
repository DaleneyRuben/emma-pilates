import { AdministrationError } from '../../src/booking/administration/administration-errors';
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
const staff = (key: string) => deterministicId(`staff-member:${key}`);
const centro = deterministicId('branch:centro');
const mat = deterministicId('class-type:mat');

describe('Prisma weekly schedule batch (WEB-025)', () => {
  let world: EvaluationTestWorld;
  const batch = () =>
    createPrismaScheduleBatch(world.prisma, { now: () => fixtureNow });
  const administrator = () => world.principalOf('paola.mendoza@example.com');
  const shared = {
    branchId: centro,
    classTypeId: mat,
    trainerStaffMemberId: staff('daniela'),
    capacity: 10,
    effectiveFrom: civil('2026-09-22'),
  };
  const scheduleCount = () =>
    world.prisma.sessionSchedule.count({
      where: { classTypeId: mat, branchId: centro },
    });

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('creates one weekly schedule per row and materializes each at once', async () => {
    const before = await scheduleCount();

    const result = await batch().createSchedules(
      {
        ...shared,
        rows: [
          { weekday: 2, startsAtLocal: '06:00' },
          { weekday: 4, startsAtLocal: '20:30' },
        ],
      },
      await administrator(),
    );

    expect(
      result.schedules.map(({ schedule }) => [
        schedule.weekday,
        schedule.startsAtLocal.toISOString().slice(11, 16),
        schedule.capacity,
      ]),
    ).toEqual([
      [2, '06:00', 10],
      [4, '20:30', 10],
    ]);
    for (const { schedule, created } of result.schedules) {
      expect(created).toBeGreaterThan(0);
      await expect(
        world.prisma.session.count({
          where: { sessionScheduleId: schedule.id },
        }),
      ).resolves.toBe(created);
    }
    await expect(scheduleCount()).resolves.toBe(before + 2);
  });

  it('saves no row when rows repeat each other or the Trainer cannot teach there', async () => {
    const before = await scheduleCount();
    const admin = await administrator();

    await expect(
      codeOf(
        batch().createSchedules(
          {
            ...shared,
            rows: [
              { weekday: 6, startsAtLocal: '06:00' },
              { weekday: 6, startsAtLocal: '06:30' },
            ],
          },
          admin,
        ),
      ),
    ).resolves.toBe('schedule_rows_overlap');
    await expect(
      codeOf(
        batch().createSchedules(
          {
            ...shared,
            trainerStaffMemberId: staff('andrea'),
            rows: [{ weekday: 6, startsAtLocal: '06:00' }],
          },
          admin,
        ),
      ),
    ).resolves.toBe('trainer_not_assignable');
    await expect(
      codeOf(
        batch().createSchedules(
          {
            ...shared,
            effectiveFrom: civil('2026-09-01'),
            rows: [{ weekday: 6, startsAtLocal: '06:00' }],
          },
          admin,
        ),
      ),
    ).resolves.toBe('effective_date_invalid');
    await expect(
      codeOf(
        batch().createSchedules(
          { ...shared, rows: [{ weekday: 6, startsAtLocal: '06:00' }] },
          await world.principalOf('camila.rojas@example.com'),
        ),
      ),
    ).resolves.toBe('administration_access_denied');
    await expect(scheduleCount()).resolves.toBe(before);
  });
});
