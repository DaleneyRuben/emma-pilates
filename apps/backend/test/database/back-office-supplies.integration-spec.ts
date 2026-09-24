import { randomUUID } from 'node:crypto';
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
    if (error instanceof BackOfficeError) return error.code;
    return String(error);
  }
};

describe('Prisma Back Office supplies', () => {
  let world: EvaluationTestWorld;
  let clock = fixtureNow;
  const supplies = () =>
    createPrismaSupplies(world.prisma, { now: () => clock });
  const administrator = () => world.principalOf('paola.mendoza@example.com');
  const assistant = () => world.principalOf('camila.rojas@example.com');
  const centro = branchIdOf('centro');
  const equipetrol = branchIdOf('equipetrol');
  const urubo = branchIdOf('urubo');

  const createSupply = async (
    name: string,
    initialQuantity: number,
    lowStockThreshold = 2,
    branchId = centro,
  ) =>
    supplies().createSupply(
      { branchId, name, initialQuantity, lowStockThreshold },
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

  it('lets only an Administrator create and list a Branch’s Supplies with the low-stock flag', async () => {
    const paper = await createSupply(' Papel higiénico ', 10, 4);
    expect(paper).toMatchObject({
      branchId: centro,
      name: 'Papel higiénico',
      quantityOnHand: 10,
      lowStockThreshold: 4,
      lowStock: false,
      archivedAt: null,
    });
    const soap = await createSupply('Jabón líquido', 2, 2);
    expect(soap.lowStock).toBe(true);

    await expect(codeOf(createSupply('PAPEL higiénico', 3))).resolves.toBe(
      'supply_name_taken',
    );
    await expect(
      createSupply('Papel higiénico', 0, 0, equipetrol),
    ).resolves.toMatchObject({ branchId: equipetrol, lowStock: true });
    await expect(codeOf(createSupply('Toallas', 5, -1))).resolves.toBe(
      'invalid_back_office_value',
    );
    await expect(
      codeOf(createSupply('Toallas', 5, 1, randomUUID())),
    ).resolves.toBe('branch_not_found');
    await expect(
      codeOf(
        supplies().createSupply(
          {
            branchId: centro,
            name: 'Toallas',
            initialQuantity: 5,
            lowStockThreshold: 1,
          },
          await assistant(),
        ),
      ),
    ).resolves.toBe('back_office_access_denied');

    const listed = await supplies().listSupplies(
      { branchId: centro, status: 'active', page: 1, pageSize: 20 },
      await administrator(),
    );
    expect(
      listed.items.map((supply) => [supply.name, supply.lowStock]),
    ).toEqual([
      ['Jabón líquido', true],
      ['Papel higiénico', false],
    ]);
  });

  it('edits the name and threshold but never the stock', async () => {
    const towels = await createSupply('Toallas de papel', 6, 1);
    const updated = await supplies().updateSupply(
      { supplyId: towels.id, name: 'Toallas de mano', lowStockThreshold: 6 },
      await administrator(),
    );
    expect(updated).toMatchObject({
      name: 'Toallas de mano',
      quantityOnHand: 6,
      lowStockThreshold: 6,
      lowStock: true,
    });
    await expect(
      codeOf(
        supplies().updateSupply(
          { supplyId: randomUUID(), name: 'X', lowStockThreshold: 1 },
          await administrator(),
        ),
      ),
    ).resolves.toBe('supply_not_found');
  });

  it('records Withdrawals and Restocks once per Idempotency-Key and never below zero', async () => {
    const detergent = await createSupply('Detergente', 10);
    const key = randomUUID();
    const first = await supplies().recordWithdrawal(
      { supplyId: detergent.id, quantity: 3 },
      await administrator(),
      key,
    );
    expect(first).toMatchObject({
      supplyId: detergent.id,
      quantity: 3,
      quantityOnHand: 7,
      recordedAt: fixtureNow,
    });
    await expect(
      supplies().recordWithdrawal(
        { supplyId: detergent.id, quantity: 3 },
        await administrator(),
        key,
      ),
    ).resolves.toEqual(first);
    await expect(
      codeOf(
        supplies().recordWithdrawal(
          { supplyId: detergent.id, quantity: 4 },
          await administrator(),
          key,
        ),
      ),
    ).resolves.toBe('idempotency_key_reused');
    await expect(
      codeOf(
        supplies().recordWithdrawal(
          { supplyId: detergent.id, quantity: 8 },
          await administrator(),
          randomUUID(),
        ),
      ),
    ).resolves.toBe('insufficient_stock');

    await expect(
      supplies().recordRestock(
        { supplyId: detergent.id, quantity: 5 },
        await administrator(),
        randomUUID(),
      ),
    ).resolves.toMatchObject({ quantity: 5, quantityOnHand: 12 });
    await expect(
      codeOf(
        supplies().recordRestock(
          { supplyId: detergent.id, quantity: 1 },
          await assistant(),
          randomUUID(),
        ),
      ),
    ).resolves.toBe('back_office_access_denied');

    const account = await world.prisma.account.findUniqueOrThrow({
      where: { email: 'paola.mendoza@example.com' },
    });
    await expect(
      world.prisma.withdrawal.findMany({
        where: { supplyId: detergent.id },
        select: { quantity: true, recordedByAccountId: true },
      }),
    ).resolves.toEqual([{ quantity: 3, recordedByAccountId: account.id }]);
  });

  it('lets only one of two concurrent Withdrawals take the last units', async () => {
    const mats = await createSupply('Toallitas desinfectantes', 10);
    const outcomes = await Promise.all(
      [randomUUID(), randomUUID()].map(async (key) =>
        codeOf(
          supplies().recordWithdrawal(
            { supplyId: mats.id, quantity: 6 },
            await administrator(),
            key,
          ),
        ),
      ),
    );
    expect(outcomes.sort()).toEqual(['insufficient_stock', 'resolved']);

    const key = randomUUID();
    const replays = await Promise.all(
      [1, 2].map(async () =>
        supplies().recordWithdrawal(
          { supplyId: mats.id, quantity: 1 },
          await administrator(),
          key,
        ),
      ),
    );
    expect(replays[0]).toEqual(replays[1]);
    await expect(
      world.prisma.supply.findUniqueOrThrow({ where: { id: mats.id } }),
    ).resolves.toMatchObject({ quantityOnHand: 3 });
    await expect(
      world.prisma.withdrawal.count({ where: { supplyId: mats.id } }),
    ).resolves.toBe(2);
  });

  it('archives a Supply out of the list and refuses further movements and edits', async () => {
    const bleach = await createSupply('Lavandina', 4);
    const archived = await supplies().archiveSupply(
      { supplyId: bleach.id },
      await administrator(),
    );
    expect(archived.archivedAt).toEqual(fixtureNow);
    await expect(
      supplies().archiveSupply({ supplyId: bleach.id }, await administrator()),
    ).resolves.toEqual(archived);

    const listed = await supplies().listSupplies(
      { branchId: centro, status: 'active', page: 1, pageSize: 20 },
      await administrator(),
    );
    expect(listed.items.map((supply) => supply.id)).not.toContain(bleach.id);
    await expect(
      codeOf(
        supplies().recordWithdrawal(
          { supplyId: bleach.id, quantity: 1 },
          await administrator(),
          randomUUID(),
        ),
      ),
    ).resolves.toBe('supply_archived');
    await expect(
      codeOf(
        supplies().updateSupply(
          { supplyId: bleach.id, name: 'Lavandina', lowStockThreshold: 1 },
          await administrator(),
        ),
      ),
    ).resolves.toBe('supply_archived');
    await expect(createSupply('Lavandina', 2)).resolves.toMatchObject({
      name: 'Lavandina',
      archivedAt: null,
    });
  });

  it('lists a Branch’s Withdrawals by Bolivia month with per-Supply totals', async () => {
    const gloves = await createSupply('Guantes', 20, 2, urubo);
    const wipes = await createSupply('Paños', 20, 2, urubo);
    const withdraw = async (supplyId: string, quantity: number, at: string) => {
      clock = new Date(at);
      await supplies().recordWithdrawal(
        { supplyId, quantity },
        await administrator(),
        randomUUID(),
      );
    };
    // 23:30 on 30 September in Bolivia, then 00:30 on 1 October.
    await withdraw(gloves.id, 2, '2026-10-01T03:30:00.000Z');
    await withdraw(wipes.id, 1, '2026-09-15T14:00:00.000Z');
    await withdraw(gloves.id, 3, '2026-09-10T14:00:00.000Z');
    await withdraw(gloves.id, 5, '2026-10-01T04:30:00.000Z');
    await withdraw(gloves.id, 1, '2026-09-20T14:00:00.000Z');

    const september = await supplies().listWithdrawals(
      { branchId: urubo, month: '2026-09', page: 1, pageSize: 2 },
      await administrator(),
    );
    const guantes = { supplyId: gloves.id, supplyName: 'Guantes' };
    const panos = { supplyId: wipes.id, supplyName: 'Paños' };
    expect(september).toMatchObject({
      month: '2026-09',
      page: 1,
      pageSize: 2,
      totalItems: 4,
      items: [
        {
          ...guantes,
          quantity: 2,
          recordedAt: new Date('2026-10-01T03:30:00.000Z'),
        },
        {
          ...guantes,
          quantity: 1,
          recordedAt: new Date('2026-09-20T14:00:00.000Z'),
        },
      ],
      totals: [
        { ...guantes, quantity: 6 },
        { ...panos, quantity: 1 },
      ],
    });

    const glovesOnly = await supplies().listWithdrawals(
      {
        branchId: urubo,
        month: '2026-09',
        supplyId: gloves.id,
        page: 1,
        pageSize: 20,
      },
      await administrator(),
    );
    expect(glovesOnly.totalItems).toBe(3);
    expect(glovesOnly.totals).toEqual([{ ...guantes, quantity: 6 }]);

    const october = await supplies().listWithdrawals(
      { branchId: urubo, month: '2026-10', page: 1, pageSize: 20 },
      await administrator(),
    );
    expect(october.totals).toEqual([{ ...guantes, quantity: 5 }]);
    await expect(
      supplies().listWithdrawals(
        { branchId: equipetrol, month: '2026-09', page: 1, pageSize: 20 },
        await administrator(),
      ),
    ).resolves.toMatchObject({ totalItems: 0, items: [], totals: [] });
  });
});
