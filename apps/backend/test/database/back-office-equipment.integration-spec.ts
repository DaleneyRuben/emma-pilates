import { randomUUID } from 'node:crypto';
import { BackOfficeError } from '../../src/back-office/back-office-errors';
import { createPrismaEquipment } from '../../src/back-office/equipment/prisma-equipment';
import {
  branchIdOf,
  fixtureNow,
  startEvaluationTestWorld,
  type EvaluationTestWorld,
} from './evaluation-test-support';

const codeOf = async (work: Promise<unknown>): Promise<string> => {
  try {
    await work;
    return 'resolved';
  } catch (error) {
    if (error instanceof BackOfficeError) return error.code;
    return String(error);
  }
};

describe('Prisma Back Office equipment', () => {
  let world: EvaluationTestWorld;
  let clock = fixtureNow;
  const equipment = () =>
    createPrismaEquipment(world.prisma, { now: () => clock });
  const administrator = () => world.principalOf('paola.mendoza@example.com');
  const assistant = () => world.principalOf('camila.rojas@example.com');
  const trainer = () => world.principalOf('emma.vargas@example.com');
  const centro = branchIdOf('centro');
  const urubo = branchIdOf('urubo');

  const register = async (
    kind: 'reformer' | 'cadillac' | 'mat',
    number: number,
    branchId = centro,
  ) =>
    equipment().createEquipment(
      { branchId, kind, number },
      await administrator(),
    );

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
  });

  afterEach(() => {
    clock = fixtureNow;
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('lets only an Administrator register and list a Branch’s Equipment, numbered once per kind', async () => {
    await register('mat', 1);
    await register('reformer', 2);
    const first = await register('reformer', 1);
    expect(first).toMatchObject({
      branchId: centro,
      kind: 'reformer',
      number: 1,
      status: 'working',
      openIssueCount: 0,
    });
    await register('reformer', 1, urubo);

    await expect(codeOf(register('reformer', 1))).resolves.toBe(
      'equipment_number_taken',
    );
    await expect(codeOf(register('reformer', 0))).resolves.toBe(
      'invalid_back_office_value',
    );
    await expect(codeOf(register('mat', 2, randomUUID()))).resolves.toBe(
      'branch_not_found',
    );
    for (const principal of [await assistant(), await trainer()]) {
      await expect(
        codeOf(
          equipment().createEquipment(
            { branchId: centro, kind: 'cadillac', number: 1 },
            principal,
          ),
        ),
      ).resolves.toBe('back_office_access_denied');
      await expect(
        codeOf(equipment().listEquipment({ branchId: centro }, principal)),
      ).resolves.toBe('back_office_access_denied');
    }

    const listed = await equipment().listEquipment(
      { branchId: centro },
      await administrator(),
    );
    expect(listed.items.map((item) => [item.kind, item.number])).toEqual([
      ['reformer', 1],
      ['reformer', 2],
      ['mat', 1],
    ]);
  });

  it('retires a piece for good, keeps it out of the list, and frees its number', async () => {
    const cadillac = await register('cadillac', 7);
    const retired = await equipment().archiveEquipment(
      { equipmentId: cadillac.id },
      await administrator(),
    );
    expect(retired.archivedAt).toEqual(fixtureNow);
    await expect(
      equipment().archiveEquipment(
        { equipmentId: cadillac.id },
        await administrator(),
      ),
    ).resolves.toMatchObject({ archivedAt: fixtureNow });
    const listed = await equipment().listEquipment(
      { branchId: centro },
      await administrator(),
    );
    expect(listed.items.map((item) => item.id)).not.toContain(cadillac.id);
    await expect(register('cadillac', 7)).resolves.toMatchObject({
      number: 7,
    });
    await expect(
      codeOf(
        equipment().reportIssue(
          {
            equipmentId: cadillac.id,
            description: 'Cable roto',
            outOfService: true,
          },
          await administrator(),
        ),
      ),
    ).resolves.toBe('equipment_archived');
    await expect(
      codeOf(
        equipment().archiveEquipment(
          { equipmentId: randomUUID() },
          await administrator(),
        ),
      ),
    ).resolves.toBe('equipment_not_found');
  });

  it('records faults, derives the state, and resolves each one once', async () => {
    const reformer = await register('reformer', 5);
    const report = (description: string, outOfService: boolean) =>
      administrator().then((principal) =>
        equipment().reportIssue(
          { equipmentId: reformer.id, description, outOfService },
          principal,
        ),
      );

    clock = new Date('2026-09-21T16:00:00.000Z');
    const worn = await report(' La correa está gastada. ', false);
    expect(worn).toMatchObject({
      equipmentId: reformer.id,
      equipmentKind: 'reformer',
      equipmentNumber: 5,
      description: 'La correa está gastada.',
      outOfService: false,
      reportedAt: clock,
      reportedByName: 'Paola Mendoza',
      resolvedAt: null,
      resolvedByName: null,
    });
    const stateOf = async () =>
      (
        await equipment().listEquipment(
          { branchId: centro },
          await administrator(),
        )
      ).items.find((item) => item.id === reformer.id);
    await expect(stateOf()).resolves.toMatchObject({
      status: 'faulty',
      openIssueCount: 1,
    });

    clock = new Date('2026-09-21T17:00:00.000Z');
    const broken = await report('El resorte rojo se soltó.', true);
    await expect(stateOf()).resolves.toMatchObject({
      status: 'out_of_service',
      openIssueCount: 2,
    });
    await expect(codeOf(report('   ', true))).resolves.toBe(
      'invalid_back_office_value',
    );
    await expect(codeOf(report('x'.repeat(501), true))).resolves.toBe(
      'invalid_back_office_value',
    );

    clock = new Date('2026-09-22T14:00:00.000Z');
    await expect(
      codeOf(
        equipment().resolveIssue({ issueId: broken.id }, await assistant()),
      ),
    ).resolves.toBe('back_office_access_denied');
    const resolved = await equipment().resolveIssue(
      { issueId: broken.id },
      await administrator(),
    );
    expect(resolved).toMatchObject({
      resolvedAt: clock,
      resolvedByName: 'Paola Mendoza',
    });
    await expect(
      codeOf(
        equipment().resolveIssue({ issueId: broken.id }, await administrator()),
      ),
    ).resolves.toBe('equipment_issue_resolved');
    await expect(
      codeOf(
        equipment().resolveIssue(
          { issueId: randomUUID() },
          await administrator(),
        ),
      ),
    ).resolves.toBe('equipment_issue_not_found');
    await expect(stateOf()).resolves.toMatchObject({
      status: 'faulty',
      openIssueCount: 1,
    });

    const open = await equipment().listIssues(
      { branchId: centro, status: 'open', page: 1, pageSize: 20 },
      await administrator(),
    );
    expect(open.items.map((issue) => issue.id)).toEqual([worn.id]);
    const closed = await equipment().listIssues(
      { branchId: centro, status: 'resolved', page: 1, pageSize: 20 },
      await administrator(),
    );
    expect(closed).toMatchObject({ totalItems: 1, page: 1, pageSize: 20 });
    expect(closed.items[0]).toMatchObject({
      id: broken.id,
      resolvedByName: 'Paola Mendoza',
    });
    await expect(
      equipment().listIssues(
        { branchId: urubo, status: 'open', page: 1, pageSize: 20 },
        await administrator(),
      ),
    ).resolves.toMatchObject({ items: [], totalItems: 0 });
  });
});
