import { randomUUID } from 'node:crypto';
import { BackOfficeError } from '../../src/back-office/back-office-errors';
import { createPrismaExpenses } from '../../src/back-office/expenses/prisma-expenses';
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

describe('Prisma Back Office expenses', () => {
  let world: EvaluationTestWorld;
  const expenses = () =>
    createPrismaExpenses(world.prisma, { now: () => fixtureNow });
  const administrator = () => world.principalOf('paola.mendoza@example.com');
  const assistant = () => world.principalOf('camila.rojas@example.com');
  const centro = branchIdOf('centro');
  const equipetrol = branchIdOf('equipetrol');
  const auditsOf = (targetId: string) =>
    world.prisma.auditRecord.findMany({
      where: { targetId },
      orderBy: { occurredAt: 'asc' },
      select: {
        actionCode: true,
        targetType: true,
        branchId: true,
        metadata: true,
      },
    });
  const category = async (name: string) =>
    expenses().createExpenseCategory({ name }, await administrator());

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('adds unique Expense Categories and removes only unused ones, keeping them hidden', async () => {
    const maintenance = await category(' Mantenimiento ');
    expect(maintenance).toMatchObject({ name: 'Mantenimiento', inUse: false });
    await expect(codeOf(category('MANTENIMIENTO'))).resolves.toBe(
      'expense_category_name_taken',
    );
    const cleaning = await category('Limpieza');
    await expenses().recordExpense(
      {
        branchId: centro,
        expenseCategoryId: maintenance.id,
        amountCentavos: 10_000,
        incurredOn: civil('2026-09-10'),
      },
      await administrator(),
      randomUUID(),
    );

    const listed = await expenses().listExpenseCategories(
      await administrator(),
    );
    expect(listed.map(({ name, inUse }) => [name, inUse])).toEqual([
      ['Limpieza', false],
      ['Mantenimiento', true],
    ]);
    await expect(
      codeOf(
        expenses().deleteExpenseCategory(
          { expenseCategoryId: maintenance.id },
          await administrator(),
        ),
      ),
    ).resolves.toBe('expense_category_in_use');
    await expect(
      expenses().deleteExpenseCategory(
        { expenseCategoryId: cleaning.id },
        await administrator(),
      ),
    ).resolves.toBeUndefined();
    await expect(
      codeOf(
        expenses().deleteExpenseCategory(
          { expenseCategoryId: cleaning.id },
          await administrator(),
        ),
      ),
    ).resolves.toBe('expense_category_not_found');
    // ADR-0086: the removed category stays, hidden, and frees its name.
    await expect(
      world.prisma.expenseCategory.findUniqueOrThrow({
        where: { id: cleaning.id },
      }),
    ).resolves.toMatchObject({ deletedAt: expect.any(Date) as Date });
    await expect(
      expenses()
        .listExpenseCategories(await administrator())
        .then((categories) => categories.map(({ name }) => name)),
    ).resolves.toEqual(['Mantenimiento']);
    await expect(
      codeOf(
        expenses().recordExpense(
          {
            branchId: centro,
            expenseCategoryId: cleaning.id,
            amountCentavos: 5_000,
            incurredOn: civil('2026-09-10'),
          },
          await administrator(),
          randomUUID(),
        ),
      ),
    ).resolves.toBe('expense_category_not_found');
    await expect(category('Limpieza')).resolves.toMatchObject({
      name: 'Limpieza',
    });
    await expect(
      codeOf(
        expenses().createExpenseCategory({ name: 'Otros' }, await assistant()),
      ),
    ).resolves.toBe('back_office_access_denied');
  });

  it('records a Branch Expense once per Idempotency-Key with an audit record', async () => {
    const repair = await category('Reparación');
    const admin = await administrator();
    const key = randomUUID();
    const input = {
      branchId: centro,
      expenseCategoryId: repair.id,
      amountCentavos: 45_050,
      incurredOn: civil('2026-09-15'),
    };
    const expense = await expenses().recordExpense(input, admin, key);
    expect(expense).toMatchObject({
      branchId: centro,
      expenseCategoryId: repair.id,
      expenseCategoryName: 'Reparación',
      amountCentavos: 45_050,
      incurredOn: civil('2026-09-15'),
    });
    await expect(expenses().recordExpense(input, admin, key)).resolves.toEqual(
      expense,
    );
    await expect(auditsOf(expense.id)).resolves.toEqual([
      {
        actionCode: 'expense.recorded',
        targetType: 'expense',
        branchId: centro,
        metadata: {
          amountCentavos: 45_050,
          incurredOn: '2026-09-15',
          expenseCategoryId: repair.id,
        },
      },
    ]);

    const record = async (change: Partial<typeof input>) =>
      codeOf(
        expenses().recordExpense(
          { ...input, ...change },
          await administrator(),
          randomUUID(),
        ),
      );
    await expect(record({ amountCentavos: -1 })).resolves.toBe(
      'invalid_back_office_value',
    );
    await expect(record({ incurredOn: civil('2026-09-22') })).resolves.toBe(
      'date_in_future',
    );
    await expect(record({ expenseCategoryId: randomUUID() })).resolves.toBe(
      'expense_category_not_found',
    );
    await expect(record({ branchId: randomUUID() })).resolves.toBe(
      'branch_not_found',
    );
  });

  it('corrects an Expense’s category, amount, and date and audits the previous values', async () => {
    const supplies = await category('Insumos');
    const services = await category('Servicios');
    const admin = await administrator();
    const expense = await expenses().recordExpense(
      {
        branchId: equipetrol,
        expenseCategoryId: supplies.id,
        amountCentavos: 20_000,
        incurredOn: civil('2026-09-02'),
      },
      admin,
      randomUUID(),
    );
    await expect(
      expenses().updateExpense(
        {
          expenseId: expense.id,
          expenseCategoryId: services.id,
          amountCentavos: 20_000,
          incurredOn: civil('2026-09-03'),
        },
        admin,
      ),
    ).resolves.toMatchObject({
      branchId: equipetrol,
      expenseCategoryName: 'Servicios',
      incurredOn: civil('2026-09-03'),
    });
    const audits = await auditsOf(expense.id);
    expect(audits[1]).toEqual({
      actionCode: 'expense.updated',
      targetType: 'expense',
      branchId: equipetrol,
      metadata: {
        previousExpenseCategoryId: supplies.id,
        expenseCategoryId: services.id,
        previousIncurredOn: '2026-09-02',
        incurredOn: '2026-09-03',
      },
    });
    await expect(
      codeOf(
        expenses().updateExpense(
          {
            expenseId: randomUUID(),
            expenseCategoryId: services.id,
            amountCentavos: 1,
            incurredOn: civil('2026-09-03'),
          },
          admin,
        ),
      ),
    ).resolves.toBe('expense_not_found');
  });

  it('lists one Branch’s Expenses newest first with category and date filters', async () => {
    const rent = await category('Alquiler');
    const admin = await administrator();
    const urubo = branchIdOf('urubo');
    for (const [incurredOn, amountCentavos] of [
      ['2026-08-30', 1_000],
      ['2026-09-04', 2_000],
      ['2026-09-18', 3_000],
    ] as const) {
      await expenses().recordExpense(
        {
          branchId: urubo,
          expenseCategoryId: rent.id,
          amountCentavos,
          incurredOn: civil(incurredOn),
        },
        admin,
        randomUUID(),
      );
    }
    await expect(
      expenses().listExpenses(
        {
          branchId: urubo,
          expenseCategoryId: rent.id,
          from: civil('2026-09-01'),
          to: civil('2026-09-18'),
          page: 1,
          pageSize: 20,
        },
        admin,
      ),
    ).resolves.toMatchObject({
      totalItems: 2,
      items: [
        { amountCentavos: 3_000, incurredOn: civil('2026-09-18') },
        { amountCentavos: 2_000, incurredOn: civil('2026-09-04') },
      ],
    });
    await expect(
      expenses().listExpenses({ branchId: urubo, page: 2, pageSize: 2 }, admin),
    ).resolves.toMatchObject({
      totalItems: 3,
      items: [{ amountCentavos: 1_000 }],
    });
  });
});
