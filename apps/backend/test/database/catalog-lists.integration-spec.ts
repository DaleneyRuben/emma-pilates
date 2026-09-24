import { AdministrationError } from '../../src/booking/administration/administration-errors';
import { createPrismaCatalogLists } from '../../src/booking/administration/prisma-catalog-lists';
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

// WEB-003: the admin catalog tables read one page at a time (ADR-0061) with
// the allowlisted status filters of ADR-0062.
describe('Prisma catalog lists', () => {
  let world: EvaluationTestWorld;
  const lists = () => createPrismaCatalogLists(world.prisma);
  const administrator = () => world.principalOf('paola.mendoza@example.com');
  const assistant = () => world.principalOf('camila.rojas@example.com');

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
    await world.prisma.branch.create({
      data: {
        name: 'Antigua',
        address: 'Calle Cerrada 1',
        archivedAt: fixtureNow,
      },
    });
    await world.prisma.classType.create({
      data: {
        name: 'Barre archivado',
        description: 'Ya no se dicta.',
        durationMinutes: 50,
        defaultCapacity: 8,
        archivedAt: fixtureNow,
      },
    });
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('pages active Branches by name and filters archived ones', async () => {
    const active = await lists().listBranches(
      { status: 'active', page: 1, pageSize: 2 },
      await administrator(),
    );
    expect(active).toMatchObject({ page: 1, pageSize: 2, totalItems: 3 });
    expect(active.items.map((branch) => branch.name)).toEqual([
      'Centro',
      'Equipetrol',
    ]);

    const second = await lists().listBranches(
      { status: 'active', page: 2, pageSize: 2 },
      await administrator(),
    );
    expect(second.items.map((branch) => branch.name)).toEqual(['Urubó']);

    const archived = await lists().listBranches(
      { status: 'archived', page: 1, pageSize: 20 },
      await administrator(),
    );
    expect(archived.items).toEqual([
      expect.objectContaining({ name: 'Antigua', archivedAt: fixtureNow }),
    ]);

    const all = await lists().listBranches(
      { status: 'all', page: 1, pageSize: 20 },
      await administrator(),
    );
    expect(all.totalItems).toBe(4);
  });

  it('pages Class Types with the same status filter', async () => {
    const active = await lists().listClassTypes(
      { status: 'active', page: 1, pageSize: 20 },
      await administrator(),
    );
    const names = active.items.map((classType) => classType.name);
    expect(names).not.toContain('Barre archivado');
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(active.totalItems).toBe(names.length);

    const archived = await lists().listClassTypes(
      { status: 'archived', page: 1, pageSize: 20 },
      await administrator(),
    );
    expect(archived.items.map((classType) => classType.name)).toEqual([
      'Barre archivado',
    ]);
  });

  it('pages Plans in display order and filters by visibility', async () => {
    const plans = await lists().listPlans(
      { visibility: 'all', page: 1, pageSize: 20 },
      await administrator(),
    );
    expect(plans.totalItems).toBeGreaterThan(1);
    const orders = plans.items.map((plan) => plan.displayOrder);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));

    const hiddenPlan = plans.items[0];
    await world.prisma.plan.update({
      where: { id: hiddenPlan.id },
      data: { hiddenAt: fixtureNow },
    });

    const hidden = await lists().listPlans(
      { visibility: 'hidden', page: 1, pageSize: 20 },
      await administrator(),
    );
    expect(hidden.items.map((plan) => plan.id)).toEqual([hiddenPlan.id]);
    const visible = await lists().listPlans(
      { visibility: 'visible', page: 1, pageSize: 20 },
      await administrator(),
    );
    expect(visible.totalItems).toBe(plans.totalItems - 1);
  });

  it('lets only an Administrator read the catalog tables', async () => {
    await expect(
      codeOf(
        lists().listBranches(
          { status: 'active', page: 1, pageSize: 20 },
          await assistant(),
        ),
      ),
    ).resolves.toBe('administration_access_denied');
  });
});
