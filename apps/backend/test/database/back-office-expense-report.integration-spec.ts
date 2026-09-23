import { randomUUID } from 'node:crypto';
import { BackOfficeError } from '../../src/back-office/back-office-errors';
import { createPrismaExpenses } from '../../src/back-office/expenses/prisma-expenses';
import { createPrismaSalaryPayments } from '../../src/back-office/payroll/prisma-salary-payments';
import { createPrismaExpenseReport } from '../../src/back-office/reports/prisma-expense-report';
import {
  branchIdOf,
  startEvaluationTestWorld,
  type EvaluationTestWorld,
} from './evaluation-test-support';

const civil = (value: string) => new Date(`${value}T00:00:00.000Z`);
// 12:00 on 20 October 2026 in Bolivia, so September and October dates are past.
const now = new Date('2026-10-20T16:00:00.000Z');

describe('Prisma Back Office expense report', () => {
  let world: EvaluationTestWorld;
  const report = () =>
    createPrismaExpenseReport(world.prisma, { now: () => now });
  const administrator = () => world.principalOf('paola.mendoza@example.com');
  const centro = branchIdOf('centro');
  const equipetrol = branchIdOf('equipetrol');
  const categoryIds = { repair: '', cleaning: '' };

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
    const admin = await administrator();
    const expenses = createPrismaExpenses(world.prisma, { now: () => now });
    const payroll = createPrismaSalaryPayments(world.prisma, {
      now: () => now,
    });
    const repair = await expenses.createExpenseCategory(
      { name: 'Reparación' },
      admin,
    );
    const cleaning = await expenses.createExpenseCategory(
      { name: 'Limpieza' },
      admin,
    );
    categoryIds.repair = repair.id;
    categoryIds.cleaning = cleaning.id;
    for (const [branchId, expenseCategoryId, amountCentavos, incurredOn] of [
      [centro, repair.id, 45_000, '2026-09-15'],
      [centro, cleaning.id, 5_000, '2026-09-30'],
      [centro, cleaning.id, 7_000, '2026-10-01'],
      [equipetrol, repair.id, 30_000, '2026-09-20'],
      [centro, repair.id, 99_000, '2026-08-31'],
    ] as const) {
      await expenses.recordExpense(
        {
          branchId,
          expenseCategoryId,
          amountCentavos,
          incurredOn: civil(incurredOn),
        },
        admin,
        randomUUID(),
      );
    }
    const emma = await world.prisma.account.findUniqueOrThrow({
      where: { email: 'emma.vargas@example.com' },
      select: { staffMemberId: true },
    });
    await payroll.recordSalaryPayment(
      {
        staffMemberId: emma.staffMemberId!,
        amountCentavos: 350_000,
        paidOn: civil('2026-09-30'),
      },
      admin,
      randomUUID(),
    );
  });

  afterAll(async () => {
    await world?.stop();
  });

  // September and October 2026 in Bolivia.
  const from = new Date('2026-09-01T04:00:00.000Z');
  const until = new Date('2026-11-01T04:00:00.000Z');

  it('sums every Branch’s Expenses and the studio-wide Salary Payments', async () => {
    await expect(
      report().expenseReport({ from, until }, await administrator()),
    ).resolves.toEqual({
      from,
      until,
      branchId: null,
      totalCentavos: 437_000,
      expensesCentavos: 87_000,
      salaryPaymentsCentavos: 350_000,
      byCategory: [
        {
          expenseCategoryId: categoryIds.repair,
          expenseCategoryName: 'Reparación',
          totalCentavos: 75_000,
        },
        {
          expenseCategoryId: categoryIds.cleaning,
          expenseCategoryName: 'Limpieza',
          totalCentavos: 12_000,
        },
      ],
      months: [
        { month: '2026-09-01', totalCentavos: 430_000 },
        { month: '2026-10-01', totalCentavos: 7_000 },
      ],
      generatedAt: now,
    });
  });

  it('leaves Salary Payments out of a single-Branch report', async () => {
    await expect(
      report().expenseReport(
        { from, until, branchId: centro },
        await administrator(),
      ),
    ).resolves.toMatchObject({
      branchId: centro,
      totalCentavos: 57_000,
      expensesCentavos: 57_000,
      salaryPaymentsCentavos: 0,
      byCategory: [
        { expenseCategoryName: 'Reparación', totalCentavos: 45_000 },
        { expenseCategoryName: 'Limpieza', totalCentavos: 12_000 },
      ],
      months: [
        { month: '2026-09-01', totalCentavos: 50_000 },
        { month: '2026-10-01', totalCentavos: 7_000 },
      ],
    });
  });

  it('is only for Administrators', async () => {
    await expect(
      report().expenseReport(
        { from, until },
        await world.principalOf('camila.rojas@example.com'),
      ),
    ).rejects.toEqual(new BackOfficeError('back_office_access_denied'));
  });
});
