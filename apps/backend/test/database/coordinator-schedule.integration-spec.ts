import { AdministrationError } from '../../src/booking/administration/administration-errors';
import { createPrismaCatalogLists } from '../../src/booking/administration/prisma-catalog-lists';
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
const urubo = deterministicId('branch:urubo');
const mat = deterministicId('class-type:mat');

// IDN-009 / ADR-0102: the Coordinator runs the schedule at every Branch, her
// changes are audited as hers, and the catalog's money stays out of reach.
describe('the Coordinator on the schedule', () => {
  let world: EvaluationTestWorld;
  const schedules = () =>
    createPrismaScheduleAdministration(world.prisma, { now: () => fixtureNow });
  const coordinator = () => world.principalOf('carolina.rivas@example.com');
  const auditRoleOf = async (actionCode: string, targetId: string) =>
    (
      await world.prisma.auditRecord.findFirstOrThrow({
        where: { actionCode, targetId },
        select: { actorRole: true },
      })
    ).actorRole;

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('creates weekly schedules, alone and in a batch, at a Branch she has no row for', async () => {
    const created = await schedules().createSchedule(
      {
        branchId: urubo,
        classTypeId: mat,
        trainerStaffMemberId: staff('daniela'),
        weekday: 6,
        startsAtLocal: '09:00',
        durationMinutes: 50,
        capacity: 8,
        effectiveFrom: civil('2026-09-22'),
      },
      await coordinator(),
    );
    expect(created.schedule).toMatchObject({ branchId: urubo, weekday: 6 });

    const batch = await createPrismaScheduleBatch(world.prisma, {
      now: () => fixtureNow,
    }).createSchedules(
      {
        branchId: urubo,
        classTypeId: mat,
        trainerStaffMemberId: staff('daniela'),
        capacity: 8,
        effectiveFrom: civil('2026-09-22'),
        rows: [{ weekday: 5, startsAtLocal: '10:00', durationMinutes: 50 }],
      },
      await coordinator(),
    );
    expect(batch.schedules).toHaveLength(1);
    await expect(
      schedules().listSchedules({ branchId: urubo }, await coordinator()),
    ).resolves.not.toHaveLength(0);
  });

  it('creates and moves a one-off Session, audited with her Role', async () => {
    const session = await schedules().createSession(
      {
        branchId: urubo,
        classTypeId: mat,
        trainerStaffMemberId: staff('daniela'),
        startsAt: bolivia('2026-09-28', '15:00'),
        durationMinutes: 50,
        capacity: 8,
      },
      await coordinator(),
    );
    const moved = await schedules().updateSession(
      {
        sessionId: session.id,
        trainerStaffMemberId: staff('emma'),
      },
      await coordinator(),
    );

    expect(moved).toMatchObject({ trainerStaffMemberId: staff('emma') });
    await expect(auditRoleOf('session.updated', session.id)).resolves.toBe(
      'COORDINATOR',
    );
  });

  it('reads Branches and Class Types for the schedule but never the Plan list', async () => {
    const lists = createPrismaCatalogLists(world.prisma);

    await expect(
      lists.listBranches(
        { status: 'active', page: 1, pageSize: 20 },
        await coordinator(),
      ),
    ).resolves.toMatchObject({ page: 1 });
    await expect(
      lists.listClassTypes(
        { status: 'active', page: 1, pageSize: 20 },
        await coordinator(),
      ),
    ).resolves.toMatchObject({ page: 1 });
    await expect(
      codeOf(
        lists.listPlans(
          { visibility: 'all', page: 1, pageSize: 20 },
          await coordinator(),
        ),
      ),
    ).resolves.toBe('administration_access_denied');
  });
});
