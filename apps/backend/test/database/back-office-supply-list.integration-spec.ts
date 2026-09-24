import { BackOfficeError } from '../../src/back-office/back-office-errors';
import { createPrismaSupplies } from '../../src/back-office/supplies/prisma-supplies';
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
    return error instanceof BackOfficeError ? error.code : String(error);
  }
};

// WEB-007: AW08 pages a Branch's Supplies, AW31 filters by every Supply the
// Branch ever had, and the sidebar counts the low-stock ones (BKO-001 D8, D19).
describe('Prisma Back Office supply list', () => {
  let world: EvaluationTestWorld;
  const supplies = () =>
    createPrismaSupplies(world.prisma, { now: () => fixtureNow });
  const administrator = () => world.principalOf('paola.mendoza@example.com');
  const centro = branchIdOf('centro');
  const urubo = branchIdOf('urubo');

  const create = async (
    name: string,
    initialQuantity: number,
    lowStockThreshold: number,
    branchId = urubo,
  ) =>
    supplies().createSupply(
      { branchId, name, initialQuantity, lowStockThreshold },
      await administrator(),
    );

  const list = async (
    query: Partial<{
      status: 'active' | 'archived' | 'all';
      page: number;
      pageSize: number;
    }> = {},
  ) =>
    supplies().listSupplies(
      { branchId: urubo, status: 'active', page: 1, pageSize: 20, ...query },
      await administrator(),
    );

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
    await create('Toallas', 10, 3);
    await create('Alcohol en gel', 3, 3);
    await create('Bolsas de basura', 0, 2);
    const old = await create('Cera', 1, 5);
    await supplies().archiveSupply({ supplyId: old.id }, await administrator());
    await create('Jabón', 1, 4, centro);
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('pages the active Supplies by name with the Branch’s low-stock count', async () => {
    const first = await list({ pageSize: 2 });
    expect(first).toMatchObject({
      page: 1,
      pageSize: 2,
      totalItems: 3,
      lowStockCount: 2,
    });
    expect(first.items.map((supply) => [supply.name, supply.lowStock])).toEqual(
      [
        ['Alcohol en gel', true],
        ['Bolsas de basura', true],
      ],
    );
    const second = await list({ page: 2, pageSize: 2 });
    expect(second.items.map((supply) => supply.name)).toEqual(['Toallas']);
    expect(second.lowStockCount).toBe(2);
  });

  it('lists archived Supplies only when asked, without counting them as low stock', async () => {
    const archived = await list({ status: 'archived' });
    expect(archived.items.map((supply) => supply.name)).toEqual(['Cera']);
    expect(archived.items[0]?.archivedAt).toEqual(fixtureNow);
    expect(archived.lowStockCount).toBe(2);

    const all = await list({ status: 'all' });
    expect(all.items.map((supply) => supply.name)).toEqual([
      'Alcohol en gel',
      'Bolsas de basura',
      'Cera',
      'Toallas',
    ]);
  });

  it('refuses anyone but an Administrator', async () => {
    await expect(
      codeOf(
        supplies().listSupplies(
          { branchId: urubo, status: 'active', page: 1, pageSize: 20 },
          await world.principalOf('camila.rojas@example.com'),
        ),
      ),
    ).resolves.toBe('back_office_access_denied');
  });
});
