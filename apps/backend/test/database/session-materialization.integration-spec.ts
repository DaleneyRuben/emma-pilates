import { createPrismaSessionMaterializer } from '../../src/booking/sessions/prisma-session-materializer';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { deterministicId } from '../../src/development-fixtures/deterministic-id';
import { PrismaClient, StaffRole } from '../../src/generated/prisma/client';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const civil = (date: string): Date => new Date(`${date}T00:00:00.000Z`);
const at = (instant: string): Date => new Date(instant);
const wallClock = (hours: number, minutes = 0): Date =>
  new Date(Date.UTC(1970, 0, 1, hours, minutes));
const idOf = (key: string) => deterministicId(`session-materialization:${key}`);

describe('Prisma Session materialization', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  // Tuesday 2026-09-22, 11:00 in Bolivia.
  let clock = at('2026-09-22T15:00:00.000Z');
  const materializer = () =>
    createPrismaSessionMaterializer(prisma, { now: () => clock });

  let scheduleOrder = 0;
  const createSchedule = (
    key: string,
    values: {
      branch: string;
      classType: string;
      trainer: string;
      weekday: number;
      startsAtLocal: Date;
      capacity?: number;
      effectiveFrom?: Date;
      effectiveUntil?: Date;
    },
  ) => {
    scheduleOrder += 1;
    return prisma.sessionSchedule.create({
      data: {
        id: idOf(`schedule:${key}`),
        branchId: idOf(`branch:${values.branch}`),
        classTypeId: idOf(`class-type:${values.classType}`),
        trainerStaffMemberId: idOf(`staff:${values.trainer}`),
        weekday: values.weekday,
        startsAtLocal: values.startsAtLocal,
        capacity: values.capacity ?? 10,
        effectiveFrom: values.effectiveFrom ?? civil('2026-09-01'),
        effectiveUntil: values.effectiveUntil,
        // Older schedules materialize first, so fix the order explicitly.
        createdAt: new Date(Date.UTC(2026, 7, 1, 0, scheduleOrder)),
      },
    });
  };

  const sessionsOf = (key: string) =>
    prisma.session.findMany({
      where: { sessionScheduleId: idOf(`schedule:${key}`) },
      orderBy: { startsAt: 'asc' },
    });

  const startsOf = async (key: string) =>
    (await sessionsOf(key)).map((session) => session.startsAt.toISOString());

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({
      adapter: createPrismaAdapter(context.databaseUrl),
    });

    for (const [key, archivedAt] of [
      ['centro', null],
      ['norte', null],
      ['closed', at('2026-09-01T12:00:00.000Z')],
    ] as const) {
      await prisma.branch.create({
        data: {
          id: idOf(`branch:${key}`),
          name: key,
          address: `${key} address`,
          archivedAt,
        },
      });
    }
    for (const [key, durationMinutes, archivedAt] of [
      ['reformer', 50, null],
      ['mat', 45, null],
      ['retired', 45, at('2026-09-01T12:00:00.000Z')],
    ] as const) {
      await prisma.classType.create({
        data: {
          id: idOf(`class-type:${key}`),
          name: key,
          description: `${key} description`,
          durationMinutes,
          defaultCapacity: 12,
          archivedAt,
        },
      });
    }
    for (const [key, role, branches] of [
      ['emma', StaffRole.TRAINER, ['centro', 'norte', 'closed']],
      ['daniela', StaffRole.TRAINER, ['centro']],
      ['sofia', StaffRole.TRAINER, ['norte']],
      ['nora', StaffRole.NUTRITIONIST, ['centro']],
    ] as const) {
      await prisma.staffMember.create({
        data: {
          id: idOf(`staff:${key}`),
          name: key,
          role,
          branchAssignments: {
            create: branches.map((branch) => ({
              branchId: idOf(`branch:${branch}`),
            })),
          },
        },
      });
    }
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('materializes each eligible schedule across the horizon with its values and ignores ineligible schedules', async () => {
    await createSchedule('monday-reformer', {
      branch: 'centro',
      classType: 'reformer',
      trainer: 'emma',
      weekday: 1,
      startsAtLocal: wallClock(7),
      capacity: 10,
    });
    await createSchedule('thursday-mat', {
      branch: 'centro',
      classType: 'mat',
      trainer: 'daniela',
      weekday: 4,
      startsAtLocal: wallClock(18),
      capacity: 8,
    });
    for (const [key, values] of [
      [
        'archived-branch',
        { branch: 'closed', classType: 'mat', trainer: 'emma' },
      ],
      [
        'archived-class-type',
        { branch: 'centro', classType: 'retired', trainer: 'emma' },
      ],
      [
        'not-a-trainer',
        { branch: 'centro', classType: 'mat', trainer: 'nora' },
      ],
      [
        'unassigned-trainer',
        { branch: 'centro', classType: 'mat', trainer: 'sofia' },
      ],
      [
        'ended',
        {
          branch: 'centro',
          classType: 'mat',
          trainer: 'emma',
          effectiveUntil: civil('2026-09-22'),
        },
      ],
      [
        'beyond-horizon',
        {
          branch: 'centro',
          classType: 'mat',
          trainer: 'emma',
          effectiveFrom: civil('2026-12-01'),
        },
      ],
    ] as const) {
      await createSchedule(key, {
        ...values,
        weekday: 3,
        startsAtLocal: wallClock(12),
      });
    }

    await expect(materializer().materializeSessions()).resolves.toEqual({
      schedules: 2,
      created: 9,
      skipped: 0,
    });

    const monday = await sessionsOf('monday-reformer');
    expect(monday.map((session) => session.startsAt)).toEqual([
      at('2026-09-28T11:00:00.000Z'),
      at('2026-10-05T11:00:00.000Z'),
      at('2026-10-12T11:00:00.000Z'),
      at('2026-10-19T11:00:00.000Z'),
    ]);
    expect(monday[0]).toMatchObject({
      branchId: idOf('branch:centro'),
      classTypeId: idOf('class-type:reformer'),
      trainerStaffMemberId: idOf('staff:emma'),
      endsAt: at('2026-09-28T11:50:00.000Z'),
      capacity: 10,
      state: 'SCHEDULED',
      isException: false,
    });
    expect(await startsOf('thursday-mat')).toEqual([
      '2026-09-24T22:00:00.000Z',
      '2026-10-01T22:00:00.000Z',
      '2026-10-08T22:00:00.000Z',
      '2026-10-15T22:00:00.000Z',
      '2026-10-22T22:00:00.000Z',
    ]);
    expect(
      await prisma.session.count({
        where: {
          sessionSchedule: {
            id: {
              notIn: [
                idOf('schedule:monday-reformer'),
                idOf('schedule:thursday-mat'),
              ],
            },
          },
        },
      }),
    ).toBe(0);
  });

  it('reruns as a no-op and never recreates or reopens a cancelled occurrence', async () => {
    await prisma.session.updateMany({
      where: {
        sessionScheduleId: idOf('schedule:monday-reformer'),
        startsAt: at('2026-10-05T11:00:00.000Z'),
      },
      data: {
        state: 'CANCELLED',
        cancellationCause: 'ZERO_BOOKINGS',
        cancelledAt: clock,
      },
    });

    await expect(materializer().materializeSessions()).resolves.toEqual({
      schedules: 2,
      created: 0,
      skipped: 9,
    });

    const monday = await sessionsOf('monday-reformer');
    expect(monday).toHaveLength(4);
    expect(monday[1]).toMatchObject({
      startsAt: at('2026-10-05T11:00:00.000Z'),
      state: 'CANCELLED',
    });
  });

  it('never recreates the original start of an occurrence that was moved', async () => {
    await prisma.session.updateMany({
      where: {
        sessionScheduleId: idOf('schedule:monday-reformer'),
        startsAt: at('2026-10-12T11:00:00.000Z'),
      },
      data: {
        startsAt: at('2026-10-12T13:00:00.000Z'),
        endsAt: at('2026-10-12T13:50:00.000Z'),
        isException: true,
      },
    });

    await materializer().materializeSessions();

    await expect(startsOf('monday-reformer')).resolves.not.toContain(
      '2026-10-12T11:00:00.000Z',
    );
    await expect(sessionsOf('monday-reformer')).resolves.toHaveLength(4);
  });

  it('extends the horizon as Bolivia days pass without touching started or existing Sessions', async () => {
    const before = await sessionsOf('monday-reformer');
    // Tuesday 2026-09-29, 11:00 in Bolivia: the horizon now reaches 2026-10-29.
    clock = at('2026-09-29T15:00:00.000Z');

    await expect(materializer().materializeSessions()).resolves.toEqual({
      schedules: 2,
      created: 2,
      skipped: 7,
    });

    const after = await sessionsOf('monday-reformer');
    expect(after.slice(0, 4)).toEqual(before);
    expect(after.at(-1)?.startsAt).toEqual(at('2026-10-26T11:00:00.000Z'));
    expect((await startsOf('thursday-mat')).at(-1)).toBe(
      '2026-10-29T22:00:00.000Z',
    );
  });

  it('skips occurrences that would overlap a scheduled Session at the Branch or for the Trainer', async () => {
    // Overlaps Monday Reformer at Centro; only the cancelled 5 October frees it.
    await createSchedule('monday-mat-centro', {
      branch: 'centro',
      classType: 'mat',
      trainer: 'daniela',
      weekday: 1,
      startsAtLocal: wallClock(7, 30),
    });
    // Emma already leads Monday Reformer at Centro at that time.
    await createSchedule('monday-reformer-norte', {
      branch: 'norte',
      classType: 'reformer',
      trainer: 'emma',
      weekday: 1,
      startsAtLocal: wallClock(7, 20),
    });

    const result = await materializer().materializeSessions();

    expect(result).toMatchObject({ schedules: 4, created: 2 });
    expect(await startsOf('monday-mat-centro')).toEqual([
      '2026-10-05T11:30:00.000Z',
    ]);
    expect(await startsOf('monday-reformer-norte')).toEqual([
      '2026-10-05T11:20:00.000Z',
    ]);
  });

  it('lets concurrent runs create each occurrence exactly once', async () => {
    // Tuesday 2026-10-06: the horizon now reaches Monday 2 and Thursday 5 November.
    clock = at('2026-10-06T15:00:00.000Z');

    const results = await Promise.all([
      materializer().materializeSessions(),
      materializer().materializeSessions(),
    ]);

    expect(results.reduce((sum, result) => sum + result.created, 0)).toBe(2);
    expect((await startsOf('monday-reformer')).at(-1)).toBe(
      '2026-11-02T11:00:00.000Z',
    );
    expect((await startsOf('thursday-mat')).at(-1)).toBe(
      '2026-11-05T22:00:00.000Z',
    );
    expect(await startsOf('monday-mat-centro')).toEqual([
      '2026-10-05T11:30:00.000Z',
    ]);
  });
});
