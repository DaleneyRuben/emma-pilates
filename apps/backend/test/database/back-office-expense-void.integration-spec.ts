import { randomUUID } from 'node:crypto';
import { BackOfficeError } from '../../src/back-office/back-office-errors';
import { createPrismaExpenses } from '../../src/back-office/expenses/prisma-expenses';
import { createPrismaVoidExpense } from '../../src/back-office/expenses/prisma-void-expense';
import { monthFacts } from '../../src/back-office/finance/month-facts';
import { createPrismaFinance } from '../../src/back-office/finance/prisma-finance';
import { createPrismaExpenseReport } from '../../src/back-office/reports/prisma-expense-report';
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

const civil = (value: string) => new Date(`${value}T00:00:00.000Z`);

// Finding 104: «eliminar» a Branch Expense voids it (ADR-0086). It stays
// listed with who and when, and counts for nothing anywhere.
describe('voiding a Back Office expense', () => {
  let world: EvaluationTestWorld;
  const now = () => fixtureNow;
  const expenses = () => createPrismaExpenses(world.prisma, { now });
  const voids = () => createPrismaVoidExpense(world.prisma, { now });
  const administrator = () => world.principalOf('paola.mendoza@example.com');
  const assistant = () => world.principalOf('camila.rojas@example.com');
  const centro = branchIdOf('centro');
  let lightId = '';
  let waterId = '';
  let categoryId = '';

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
    const admin = await administrator();
    const category = await expenses().createExpenseCategory(
      { name: 'Limpieza' },
      admin,
    );
    categoryId = category.id;
    const record = (amountCentavos: number) =>
      expenses().recordExpense(
        {
          branchId: centro,
          expenseCategoryId: category.id,
          amountCentavos,
          incurredOn: civil('2026-09-17'),
        },
        admin,
        randomUUID(),
      );
    lightId = (await record(35_000)).id;
    waterId = (await record(12_000)).id;
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('refuses the Assistant, an unknown Expense, and a blank or long reason', async () => {
    await expect(
      codeOf(voids().voidExpense({ expenseId: lightId }, await assistant())),
    ).resolves.toBe('back_office_access_denied');
    await expect(
      codeOf(
        voids().voidExpense({ expenseId: randomUUID() }, await administrator()),
      ),
    ).resolves.toBe('expense_not_found');
    for (const reason of ['   ', 'x'.repeat(301)]) {
      await expect(
        codeOf(
          voids().voidExpense(
            { expenseId: lightId, reason },
            await administrator(),
          ),
        ),
      ).resolves.toBe('invalid_back_office_value');
    }
  });

  it('records who voided it, when, and why, once, with an audit record', async () => {
    const admin = await administrator();
    const voided = await voids().voidExpense(
      { expenseId: lightId, reason: ' Cargado dos veces ' },
      admin,
    );
    expect(voided).toMatchObject({
      id: lightId,
      voidedAt: fixtureNow,
      voidedByName: 'Paola Mendoza',
      voidReason: 'Cargado dos veces',
    });
    const row = await world.prisma.expense.findUniqueOrThrow({
      where: { id: lightId },
    });
    expect(row).toMatchObject({
      voidedAt: fixtureNow,
      voidedByAccountId: admin.accountId,
      voidReason: 'Cargado dos veces',
    });
    await expect(
      world.prisma.auditRecord.findMany({
        where: { targetId: lightId, actionCode: 'expense.voided' },
        select: { targetType: true, branchId: true, metadata: true },
      }),
    ).resolves.toEqual([
      {
        targetType: 'expense',
        branchId: centro,
        metadata: { amountCentavos: 35_000, reason: 'Cargado dos veces' },
      },
    ]);
    await expect(
      codeOf(voids().voidExpense({ expenseId: lightId }, admin)),
    ).resolves.toBe('expense_voided');
  });

  it('keeps a voided Expense in the list, marked, and refuses to correct it', async () => {
    const admin = await administrator();
    const page = await expenses().listExpenses(
      { branchId: centro, page: 1, pageSize: 50 },
      admin,
    );
    expect(page.totalItems).toBe(2);
    expect(page.items.find(({ id }) => id === lightId)).toMatchObject({
      voidedAt: fixtureNow,
      voidedByName: 'Paola Mendoza',
      voidReason: 'Cargado dos veces',
    });
    expect(page.items.find(({ id }) => id === waterId)).toMatchObject({
      voidedAt: null,
      voidedByName: null,
      voidReason: null,
    });
    await expect(
      codeOf(
        expenses().updateExpense(
          {
            expenseId: lightId,
            expenseCategoryId: categoryId,
            amountCentavos: 1_000,
            incurredOn: civil('2026-09-17'),
          },
          admin,
        ),
      ),
    ).resolves.toBe('expense_voided');
  });

  // FIX-091 (W11 B): Gastos shows the standing ones; the eliminated apart.
  it('lists only the standing or only the eliminated Expenses on request', async () => {
    const admin = await administrator();
    const list = (voided: boolean) =>
      expenses().listExpenses(
        { branchId: centro, voided, page: 1, pageSize: 50 },
        admin,
      );
    const standing = await list(false);
    expect(standing.totalItems).toBe(1);
    expect(standing.items.map(({ id }) => id)).toEqual([waterId]);
    const eliminated = await list(true);
    expect(eliminated.totalItems).toBe(1);
    expect(eliminated.items.map(({ id }) => id)).toEqual([lightId]);
  });

  it('leaves the voided Expense out of the expense report and the month result', async () => {
    const admin = await administrator();
    const report = await createPrismaExpenseReport(world.prisma, {
      now,
    }).expenseReport(
      {
        from: new Date('2026-09-01T04:00:00.000Z'),
        until: new Date('2026-10-01T04:00:00.000Z'),
        branchId: centro,
      },
      admin,
    );
    expect(report.expensesCentavos).toBe(12_000);
    expect(report.byCategory).toEqual([
      {
        expenseCategoryId: categoryId,
        expenseCategoryName: 'Limpieza',
        totalCentavos: 12_000,
      },
    ]);
    expect(report.months).toEqual([
      { month: '2026-09-01', totalCentavos: 12_000 },
    ]);

    await createPrismaFinance(world.prisma, {
      ofMonth: (from, until) => monthFacts(world.prisma, from, until),
    }).seedOpeningBudget(admin);
    const result = await createPrismaFinance(world.prisma, {
      ofMonth: (from, until) => monthFacts(world.prisma, from, until),
    }).monthResult({ month: civil('2026-09-01') }, admin);
    expect(result.lines.find(({ name }) => name === 'Limpieza')).toEqual(
      expect.objectContaining({ actualCentavos: 12_000 }),
    );
  });

  it('lets a category used only by eliminated Expenses be deleted', async () => {
    const admin = await administrator();
    const mistake = await expenses().createExpenseCategory(
      { name: 'Por error' },
      admin,
    );
    const { id } = await expenses().recordExpense(
      {
        branchId: centro,
        expenseCategoryId: mistake.id,
        amountCentavos: 5_000,
        incurredOn: civil('2026-09-17'),
      },
      admin,
      randomUUID(),
    );
    await voids().voidExpense({ expenseId: id }, admin);
    const listed = await expenses().listExpenseCategories(admin);
    expect(listed.find(({ name }) => name === 'Por error')?.inUse).toBe(false);
    await expect(
      expenses().deleteExpenseCategory(
        { expenseCategoryId: mistake.id },
        admin,
      ),
    ).resolves.toBeUndefined();
    const page = await expenses().listExpenses(
      { branchId: centro, page: 1, pageSize: 50 },
      admin,
    );
    expect(page.items.find((item) => item.id === id)).toMatchObject({
      expenseCategoryName: 'Por error',
    });
  });
});
