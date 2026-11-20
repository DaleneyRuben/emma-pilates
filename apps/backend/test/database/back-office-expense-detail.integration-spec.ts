import { randomUUID } from 'node:crypto';
import { createPrismaExpenses } from '../../src/back-office/expenses/prisma-expenses';
import {
  branchIdOf,
  fixtureNow,
  startEvaluationTestWorld,
  type EvaluationTestWorld,
} from './evaluation-test-support';

const civil = (value: string) => new Date(`${value}T00:00:00.000Z`);

// W11 A (owner 2026-11-19): the Gastos «Detalle» column.
describe('Prisma Back Office expense detail', () => {
  let world: EvaluationTestWorld;
  // A moving clock keeps the audit records in order.
  let tick = 0;
  const expenses = () =>
    createPrismaExpenses(world.prisma, {
      now: () => new Date(fixtureNow.getTime() + (tick += 1_000)),
    });
  const administrator = () => world.principalOf('paola.mendoza@example.com');
  const centro = branchIdOf('centro');

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('records, lists, corrects, and clears an Expense’s detail, auditing each change', async () => {
    const admin = await administrator();
    const cleaning = await expenses().createExpenseCategory(
      { name: 'Limpieza detalle' },
      admin,
    );
    const base = {
      branchId: centro,
      expenseCategoryId: cleaning.id,
      amountCentavos: 18_000,
      incurredOn: civil('2026-09-15'),
    };
    const withDetail = await expenses().recordExpense(
      { ...base, detail: 'Productos de limpieza' },
      admin,
      randomUUID(),
    );
    expect(withDetail.detail).toBe('Productos de limpieza');
    const without = await expenses().recordExpense(base, admin, randomUUID());
    expect(without.detail).toBeNull();

    const listed = await expenses().listExpenses(
      {
        branchId: centro,
        expenseCategoryId: cleaning.id,
        page: 1,
        pageSize: 20,
      },
      admin,
    );
    expect(listed.items.map(({ id, detail }) => ({ id, detail }))).toEqual(
      expect.arrayContaining([
        { id: withDetail.id, detail: 'Productos de limpieza' },
        { id: without.id, detail: null },
      ]),
    );

    // An edit from an admin web that predates the field keeps the detail.
    await expect(
      expenses().updateExpense(
        { ...base, expenseId: withDetail.id, amountCentavos: 19_000 },
        admin,
      ),
    ).resolves.toMatchObject({ detail: 'Productos de limpieza' });
    await expect(
      expenses().updateExpense(
        { ...base, expenseId: withDetail.id, detail: 'Escobas y trapos' },
        admin,
      ),
    ).resolves.toMatchObject({ detail: 'Escobas y trapos' });
    await expect(
      expenses().updateExpense(
        { ...base, expenseId: withDetail.id, detail: null },
        admin,
      ),
    ).resolves.toMatchObject({ detail: null });

    const audits = await world.prisma.auditRecord.findMany({
      where: { targetId: withDetail.id },
      orderBy: { occurredAt: 'asc' },
      select: { actionCode: true, metadata: true },
    });
    expect(audits.map(({ metadata }) => metadata)).toEqual([
      expect.objectContaining({ detail: 'Productos de limpieza' }),
      { previousAmountCentavos: 18_000, amountCentavos: 19_000 },
      {
        previousAmountCentavos: 19_000,
        amountCentavos: 18_000,
        previousDetail: 'Productos de limpieza',
        detail: 'Escobas y trapos',
      },
      { previousDetail: 'Escobas y trapos', detail: null },
    ]);
  });
});
