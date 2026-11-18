import { randomUUID } from 'node:crypto';
import { createPrismaSupplies } from '../../src/back-office/supplies/prisma-supplies';
import {
  branchIdOf,
  fixtureNow,
  startEvaluationTestWorld,
  type EvaluationTestWorld,
} from './evaluation-test-support';

// Walkthrough finding 102: AW31 names who recorded each movement and shows
// Restocks beside Withdrawals.
describe('Prisma Back Office supply movements', () => {
  let world: EvaluationTestWorld;
  let clock = fixtureNow;
  const supplies = () =>
    createPrismaSupplies(world.prisma, { now: () => clock });
  const administrator = () => world.principalOf('paola.mendoza@example.com');
  const coordinator = () => world.principalOf('carolina.rivas@example.com');
  const urubo = branchIdOf('urubo');

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
  });

  afterEach(() => {
    clock = fixtureNow;
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('lists a month’s Withdrawals and Restocks newest first, with who recorded each', async () => {
    const towels = await supplies().createSupply(
      {
        branchId: urubo,
        name: 'Toallas',
        initialQuantity: 20,
        lowStockThreshold: 4,
      },
      await administrator(),
    );
    const soap = await supplies().createSupply(
      {
        branchId: urubo,
        name: 'Jabón',
        initialQuantity: 5,
        lowStockThreshold: 1,
      },
      await administrator(),
    );
    const move = async (
      kind: 'withdrawal' | 'restock',
      supplyId: string,
      quantity: number,
      at: string,
      who = administrator,
    ) => {
      clock = new Date(at);
      const record =
        kind === 'withdrawal'
          ? supplies().recordWithdrawal
          : supplies().recordRestock;
      await record({ supplyId, quantity }, await who(), randomUUID());
    };
    await move('withdrawal', towels.id, 16, '2026-11-10T14:00:00.000Z');
    await move(
      'restock',
      towels.id,
      20,
      '2026-11-11T14:00:00.000Z',
      coordinator,
    );
    await move(
      'withdrawal',
      soap.id,
      2,
      '2026-11-12T14:00:00.000Z',
      coordinator,
    );
    await move('restock', soap.id, 3, '2026-10-30T14:00:00.000Z');

    const toallas = { supplyId: towels.id, supplyName: 'Toallas' };
    const jabon = { supplyId: soap.id, supplyName: 'Jabón' };
    const all = await supplies().listWithdrawals(
      { branchId: urubo, month: '2026-11', kind: 'all', page: 1, pageSize: 20 },
      await administrator(),
    );
    expect(all).toMatchObject({
      totalItems: 3,
      items: [
        {
          ...jabon,
          kind: 'withdrawal',
          quantity: 2,
          recordedByName: 'Carolina Rivas',
        },
        {
          ...toallas,
          kind: 'restock',
          quantity: 20,
          recordedAt: new Date('2026-11-11T14:00:00.000Z'),
          recordedByName: 'Carolina Rivas',
        },
        {
          ...toallas,
          kind: 'withdrawal',
          quantity: 16,
          recordedByName: 'Paola Mendoza',
        },
      ],
      // The consumption totals count Withdrawals only, whatever the kind.
      totals: [
        { ...jabon, quantity: 2 },
        { ...toallas, quantity: 16 },
      ],
    });

    const secondPage = await supplies().listWithdrawals(
      { branchId: urubo, month: '2026-11', kind: 'all', page: 2, pageSize: 2 },
      await administrator(),
    );
    expect(secondPage.totalItems).toBe(3);
    expect(secondPage.items).toMatchObject([{ ...toallas, quantity: 16 }]);

    const restocks = await supplies().listWithdrawals(
      {
        branchId: urubo,
        month: '2026-11',
        kind: 'restock',
        supplyId: towels.id,
        page: 1,
        pageSize: 20,
      },
      await coordinator(),
    );
    expect(restocks).toMatchObject({
      totalItems: 1,
      items: [{ ...toallas, kind: 'restock', quantity: 20 }],
      totals: [{ ...toallas, quantity: 16 }],
    });

    // Without a kind the list stays what older admin builds read.
    const withdrawals = await supplies().listWithdrawals(
      { branchId: urubo, month: '2026-11', page: 1, pageSize: 20 },
      await administrator(),
    );
    expect(withdrawals.items.map((item) => item.kind)).toEqual([
      'withdrawal',
      'withdrawal',
    ]);
  });
});
