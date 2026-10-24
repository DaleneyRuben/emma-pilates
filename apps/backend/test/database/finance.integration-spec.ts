import { randomUUID } from 'node:crypto';
import { BackOfficeError } from '../../src/back-office/back-office-errors';
import { createPrismaExpenses } from '../../src/back-office/expenses/prisma-expenses';
import { monthFacts } from '../../src/back-office/finance/month-facts';
import { openingBudgetLines } from '../../src/back-office/finance/opening-budget';
import { createPrismaFinance } from '../../src/back-office/finance/prisma-finance';
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

describe('the month result', () => {
  let world: EvaluationTestWorld;
  const finance = () =>
    createPrismaFinance(world.prisma, {
      ofMonth: (from, until) => monthFacts(world.prisma, from, until),
    });
  const administrator = () => world.principalOf('paola.mendoza@example.com');
  const assistant = () => world.principalOf('camila.rojas@example.com');

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('seeds the opening budget, counts one expense, and refuses the Assistant', async () => {
    const admin = await administrator();
    const empty = await finance().monthResult(
      { month: new Date('2026-09-01T00:00:00.000Z') },
      admin,
    );
    expect(empty.lines).toEqual([]);
    expect(empty.breakEvenCentavos).toBe(0);

    await expect(finance().seedOpeningBudget(admin)).resolves.toEqual({
      seeded: true,
    });
    await expect(finance().seedOpeningBudget(admin)).resolves.toEqual({
      seeded: false,
    });

    const expenses = createPrismaExpenses(world.prisma, {
      now: () => fixtureNow,
    });
    const category = await expenses.createExpenseCategory(
      { name: 'Alquiler' },
      admin,
    );
    const recorded = await expenses.recordExpense(
      {
        branchId: branchIdOf('centro'),
        expenseCategoryId: category.id,
        amountCentavos: 850_000,
        incurredOn: new Date('2026-09-21T00:00:00.000Z'),
      },
      admin,
      randomUUID(),
    );
    expect(recorded.amountCentavos).toBe(850_000);

    const result = await finance().monthResult(
      { month: new Date('2026-09-01T00:00:00.000Z') },
      admin,
    );
    expect(result.lines.map(({ name }) => name)).toEqual(
      openingBudgetLines.map(({ name }) => name),
    );
    expect(result.lines[0]).toMatchObject({
      name: 'Alquiler',
      budgetCentavos: 850_000,
      actualCentavos: 850_000,
    });
    expect(result.budgetTotalCentavos).toBe(2_117_500);
    expect(result.contingencyCentavos).toBe(192_500);
    expect(result.taxRatePercent).toBe(16);
    expect(result.nutritionistCostCentavos).toBe(0);

    await expect(
      codeOf(
        finance().monthResult(
          { month: new Date('2026-09-01T00:00:00.000Z') },
          await assistant(),
        ),
      ),
    ).resolves.toBe('back_office_access_denied');
    await expect(
      codeOf(finance().seedOpeningBudget(await assistant())),
    ).resolves.toBe('back_office_access_denied');
  });
});
