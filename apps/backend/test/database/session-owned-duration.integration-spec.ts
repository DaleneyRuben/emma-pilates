import { createPrismaCatalogAdministration } from '../../src/booking/administration/prisma-catalog-administration';
import { createPrismaScheduleAdministration } from '../../src/booking/administration/prisma-schedule-administration';
import { createPrismaScheduleBatch } from '../../src/booking/administration/prisma-schedule-batch';
import { createCatalogRepository } from '../../src/booking/catalog/prisma-catalog-repository';
import { createPrismaSessionMaterializer } from '../../src/booking/sessions/prisma-session-materializer';
import { deterministicId } from '../../src/development-fixtures/deterministic-id';
import {
  fixtureNow,
  startEvaluationTestWorld,
  type EvaluationTestWorld,
} from './evaluation-test-support';

const civil = (date: string) => new Date(`${date}T00:00:00.000Z`);
const bolivia = (date: string, time: string) =>
  new Date(`${date}T${time}:00.000-04:00`);
const staff = (key: string) => deterministicId(`staff-member:${key}`);
const centro = deterministicId('branch:centro');
const mat = deterministicId('class-type:mat');
const minutesOf = (session: { startsAt: Date; endsAt: Date }) =>
  (session.endsAt.getTime() - session.startsAt.getTime()) / 60_000;

// WEB-027 (booking ADR-0004): how long a class lasts is chosen with each
// Session and weekly row; the Class Type has no duration.
describe('A Session owns its duration', () => {
  let world: EvaluationTestWorld;
  const clock = { now: () => fixtureNow };
  const schedules = () =>
    createPrismaScheduleAdministration(world.prisma, clock);
  const administrator = () => world.principalOf('paola.mendoza@example.com');
  const lengthsOf = async (sessionScheduleId: string) =>
    (
      await world.prisma.session.findMany({
        where: { sessionScheduleId },
        select: { startsAt: true, endsAt: true },
      })
    ).map(minutesOf);
  const shared = {
    branchId: centro,
    classTypeId: mat,
    trainerStaffMemberId: staff('daniela'),
    capacity: 10,
  };

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('materializes a weekly schedule for its own minutes, not the Class Type', async () => {
    const result = await schedules().createSchedule(
      {
        ...shared,
        weekday: 6,
        startsAtLocal: '20:00',
        durationMinutes: 75,
        effectiveFrom: civil('2026-09-22'),
      },
      await administrator(),
    );

    expect(result.schedule.durationMinutes).toBe(75);
    expect(result.created).toBeGreaterThan(0);
    expect(new Set(await lengthsOf(result.schedule.id))).toEqual(new Set([75]));
  });

  it('gives each row of a batch its own minutes', async () => {
    const result = await createPrismaScheduleBatch(
      world.prisma,
      clock,
    ).createSchedules(
      {
        ...shared,
        effectiveFrom: civil('2026-09-22'),
        rows: [
          { weekday: 7, startsAtLocal: '06:00', durationMinutes: 30 },
          { weekday: 7, startsAtLocal: '06:30', durationMinutes: 90 },
        ],
      },
      await administrator(),
    );

    const [short, long] = result.schedules;
    expect(short.schedule.durationMinutes).toBe(30);
    expect(long.schedule.durationMinutes).toBe(90);
    expect(new Set(await lengthsOf(short.schedule.id))).toEqual(new Set([30]));
    expect(new Set(await lengthsOf(long.schedule.id))).toEqual(new Set([90]));
  });

  it('extends a schedule to the horizon for its own minutes', async () => {
    const schedule = await world.prisma.sessionSchedule.create({
      data: {
        ...shared,
        weekday: 6,
        startsAtLocal: new Date(Date.UTC(1970, 0, 1, 6, 0)),
        durationMinutes: 65,
        effectiveFrom: civil('2026-09-22'),
      },
    });

    await createPrismaSessionMaterializer(
      world.prisma,
      clock,
    ).materializeSessions();

    const lengths = await lengthsOf(schedule.id);
    expect(lengths.length).toBeGreaterThan(0);
    expect(new Set(lengths)).toEqual(new Set([65]));
  });

  it('creates a one-off Session for the minutes given and describes it with them', async () => {
    const session = await schedules().createSession(
      {
        ...shared,
        startsAt: bolivia('2026-09-24', '21:00'),
        durationMinutes: 40,
      },
      await administrator(),
    );

    expect(minutesOf(session)).toBe(40);
    const detail = await createCatalogRepository(
      world.prisma,
    ).findSessionDetail(session.id);
    expect(detail?.classType.durationMinutes).toBe(40);
  });

  it('changes one Session’s minutes and keeps its start', async () => {
    const session = await schedules().createSession(
      {
        ...shared,
        startsAt: bolivia('2026-09-25', '21:00'),
        durationMinutes: 60,
      },
      await administrator(),
    );

    const changed = await schedules().updateSession(
      { sessionId: session.id, durationMinutes: 80 },
      await administrator(),
    );

    expect(changed.startsAt).toEqual(bolivia('2026-09-25', '21:00'));
    expect(minutesOf(changed)).toBe(80);
    expect(changed.isException).toBe(true);
  });

  it('creates and edits a Class Type with no duration', async () => {
    const catalog = createPrismaCatalogAdministration(world.prisma, clock);
    const created = await catalog.createClassType(
      {
        name: 'Barre',
        description: 'Barre y Pilates',
        defaultCapacity: 8,
        equipmentNeeds: null,
      },
      await administrator(),
    );
    await catalog.updateClassType(
      {
        classTypeId: created.id,
        name: 'Barre Pilates',
        description: 'Barre y Pilates',
        defaultCapacity: 8,
        equipmentNeeds: null,
      },
      await administrator(),
    );

    expect(created).not.toHaveProperty('durationMinutes');
    const stored = await world.prisma.classType.findUniqueOrThrow({
      where: { id: created.id },
    });
    expect(stored).toMatchObject({
      name: 'Barre Pilates',
      durationMinutes: null,
    });
  });
});
