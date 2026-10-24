import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { BackOfficeError } from '../src/back-office/back-office-errors';
import {
  backOfficeControllers,
  backOfficeOperations,
} from '../src/back-office/back-office.controller';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';

const bearer = `Bearer ${'a'.repeat(43)}`;
const id = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const key = '33333333-3333-4333-8333-333333333333';
const supply = {
  id,
  branchId: other,
  name: 'Papel higiénico',
  quantityOnHand: 3,
  lowStockThreshold: 4,
  lowStock: true,
  archivedAt: null,
};
const salaryPayment = {
  id,
  staffMemberId: other,
  staffMemberName: 'Emma Vargas',
  amountCentavos: 350_000,
  paidOn: new Date('2026-09-20T00:00:00.000Z'),
};
const expense = {
  id,
  branchId: other,
  expenseCategoryId: other,
  expenseCategoryName: 'Reparación',
  amountCentavos: 45_050,
  incurredOn: new Date('2026-09-15T00:00:00.000Z'),
};

type Operation = jest.Mock<(...args: unknown[]) => Promise<unknown>>;
const operation = (): Operation =>
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

describe('back office endpoints (e2e)', () => {
  let app: INestApplication<App>;
  const resolvePrincipal =
    jest.fn<
      (
        credential: string,
        meaningfulActivity: boolean,
      ) => Promise<AuthenticatedPrincipal>
    >();
  const supplies = {
    listSupplies: operation(),
    createSupply: operation(),
    updateSupply: operation(),
    archiveSupply: operation(),
    recordWithdrawal: operation(),
    recordRestock: operation(),
    listWithdrawals: operation(),
  };
  const salaryPayments = {
    listSalaryPayments: operation(),
    recordSalaryPayment: operation(),
    updateSalaryPayment: operation(),
  };
  const expenses = {
    listExpenseCategories: operation(),
    createExpenseCategory: operation(),
    deleteExpenseCategory: operation(),
    listExpenses: operation(),
    recordExpense: operation(),
    updateExpense: operation(),
  };
  const report = { expenseReport: operation() };
  const finance = {
    monthResult: operation(),
    seedOpeningBudget: operation(),
  };
  finance.monthResult.mockResolvedValue({
    month: new Date('2026-09-01T00:00:00.000Z'),
    cashIncomeCentavos: 0,
    taxRatePercent: 16,
    taxCentavos: 0,
    budgetSubtotalCentavos: 0,
    contingencyCentavos: 0,
    budgetTotalCentavos: 0,
    lines: [],
    nutritionistCostCentavos: 0,
    resultCentavos: 0,
    breakEvenCentavos: 0,
  });
  finance.seedOpeningBudget.mockResolvedValue({ seeded: false });

  beforeEach(async () => {
    resolvePrincipal.mockResolvedValue({
      accountId: 'admin-account',
      authenticationSessionId: 'session',
      identity: {
        kind: 'staff',
        staffMemberId: 'admin',
        role: 'administrator',
        branchIds: [],
      },
    });
    supplies.createSupply.mockResolvedValue(supply);
    supplies.recordWithdrawal.mockResolvedValue({
      id: other,
      supplyId: id,
      quantity: 2,
      recordedAt: new Date('2026-09-21T15:00:00.000Z'),
      quantityOnHand: 1,
    });
    supplies.listWithdrawals.mockResolvedValue({
      month: '2026-09',
      page: 1,
      pageSize: 20,
      totalItems: 1,
      items: [
        {
          id: other,
          supplyId: id,
          supplyName: 'Papel higiénico',
          quantity: 2,
          recordedAt: new Date('2026-09-21T15:00:00.000Z'),
        },
      ],
      totals: [{ supplyId: id, supplyName: 'Papel higiénico', quantity: 2 }],
    });
    salaryPayments.recordSalaryPayment.mockResolvedValue(salaryPayment);
    salaryPayments.listSalaryPayments.mockResolvedValue({
      items: [salaryPayment],
      page: 1,
      pageSize: 20,
      totalItems: 1,
    });
    expenses.listExpenseCategories.mockResolvedValue([
      { id, name: 'Reparación', inUse: true },
    ]);
    expenses.deleteExpenseCategory.mockRejectedValue(
      new BackOfficeError('expense_category_in_use'),
    );
    expenses.recordExpense.mockResolvedValue(expense);
    expenses.updateExpense.mockResolvedValue(expense);
    report.expenseReport.mockResolvedValue({
      from: new Date('2026-09-01T04:00:00.000Z'),
      until: new Date('2026-10-01T04:00:00.000Z'),
      branchId: null,
      totalCentavos: 395_050,
      expensesCentavos: 45_050,
      salaryPaymentsCentavos: 350_000,
      byCategory: [
        {
          expenseCategoryId: other,
          expenseCategoryName: 'Reparación',
          totalCentavos: 45_050,
        },
      ],
      months: [{ month: '2026-09-01', totalCentavos: 395_050 }],
      generatedAt: new Date('2026-09-23T12:00:00.000Z'),
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: backOfficeControllers,
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        {
          provide: backOfficeOperations,
          useValue: { supplies, salaryPayments, expenses, report, finance },
        },
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  // The paged list is in back-office-supply-list.e2e-spec.ts.
  it('creates a Branch’s Supply', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/administrator/supplies')
      .set('authorization', bearer)
      .send({
        branchId: other,
        name: 'Papel higiénico',
        initialQuantity: 10,
        lowStockThreshold: 4,
      })
      .expect(201);
    expect(supplies.createSupply).toHaveBeenCalledWith(
      {
        branchId: other,
        name: 'Papel higiénico',
        initialQuantity: 10,
        lowStockThreshold: 4,
      },
      expect.anything(),
    );
    await request(app.getHttpServer())
      .post('/api/v1/administrator/supplies')
      .set('authorization', bearer)
      .send({ branchId: other, name: 'X', initialQuantity: -1 })
      .expect(400);
  });

  it('records a Withdrawal only with an Idempotency-Key and maps stock conflicts', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/administrator/supplies/${id}/withdrawals`)
      .set('authorization', bearer)
      .send({ quantity: 2 })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/api/v1/administrator/supplies/${id}/withdrawals`)
      .set('authorization', bearer)
      .set('idempotency-key', key)
      .send({ quantity: 2 })
      .expect(201)
      .expect(({ body }) =>
        expect(body).toEqual({
          id: other,
          supplyId: id,
          quantity: 2,
          recordedAt: '2026-09-21T15:00:00.000Z',
          quantityOnHand: 1,
        }),
      );
    expect(supplies.recordWithdrawal).toHaveBeenCalledWith(
      { supplyId: id, quantity: 2 },
      expect.anything(),
      key,
    );
    supplies.recordRestock.mockRejectedValueOnce(
      new BackOfficeError('supply_archived'),
    );
    await request(app.getHttpServer())
      .post(`/api/v1/administrator/supplies/${id}/restocks`)
      .set('authorization', bearer)
      .set('idempotency-key', key)
      .send({ quantity: 5 })
      .expect(409)
      .expect(({ body }) =>
        expect((body as { code: string }).code).toBe('supply_archived'),
      );
  });

  it('lists a Branch’s Withdrawals for a Bolivia month', async () => {
    await request(app.getHttpServer())
      .get(
        `/api/v1/administrator/withdrawals?branchId=${other}&month=2026-09&page=1&pageSize=20`,
      )
      .set('authorization', bearer)
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({ month: '2026-09', totalItems: 1 }),
      );
    expect(supplies.listWithdrawals).toHaveBeenCalledWith(
      { branchId: other, month: '2026-09', page: 1, pageSize: 20 },
      expect.anything(),
    );
    await request(app.getHttpServer())
      .get(`/api/v1/administrator/withdrawals?branchId=${other}&month=2026-13`)
      .set('authorization', bearer)
      .expect(400);
  });

  it('records and lists Salary Payments with civil dates', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/administrator/salary-payments')
      .set('authorization', bearer)
      .set('idempotency-key', key)
      .send({
        staffMemberId: other,
        amountCentavos: 350_000,
        paidOn: '2026-09-20',
      })
      .expect(201)
      .expect(({ body }) =>
        expect(body).toEqual({ ...salaryPayment, paidOn: '2026-09-20' }),
      );
    expect(salaryPayments.recordSalaryPayment).toHaveBeenCalledWith(
      {
        staffMemberId: other,
        amountCentavos: 350_000,
        paidOn: new Date('2026-09-20T00:00:00.000Z'),
      },
      expect.anything(),
      key,
    );
    await request(app.getHttpServer())
      .get(
        `/api/v1/administrator/salary-payments?staffMemberId=${other}&from=2026-09-01&to=2026-09-30`,
      )
      .set('authorization', bearer)
      .expect(200);
    expect(salaryPayments.listSalaryPayments).toHaveBeenCalledWith(
      {
        staffMemberId: other,
        from: new Date('2026-09-01T00:00:00.000Z'),
        to: new Date('2026-09-30T00:00:00.000Z'),
        page: 1,
        pageSize: 20,
      },
      expect.anything(),
    );
    await request(app.getHttpServer())
      .post('/api/v1/administrator/salary-payments')
      .set('authorization', bearer)
      .set('idempotency-key', key)
      .send({ staffMemberId: other, amountCentavos: 0, paidOn: '2026-09-20' })
      .expect(400);
  });

  it('manages Expense Categories and corrects an Expense', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/administrator/expense-categories')
      .set('authorization', bearer)
      .expect(200)
      .expect(({ body }) =>
        expect(body).toEqual([{ id, name: 'Reparación', inUse: true }]),
      );
    await request(app.getHttpServer())
      .delete(`/api/v1/administrator/expense-categories/${id}`)
      .set('authorization', bearer)
      .expect(409)
      .expect(({ body }) =>
        expect((body as { code: string }).code).toBe('expense_category_in_use'),
      );
    await request(app.getHttpServer())
      .put(`/api/v1/administrator/expenses/${id}`)
      .set('authorization', bearer)
      .send({
        expenseCategoryId: other,
        amountCentavos: 45_050,
        incurredOn: '2026-09-15',
      })
      .expect(200)
      .expect(({ body }) =>
        expect(body).toEqual({ ...expense, incurredOn: '2026-09-15' }),
      );
    expect(expenses.updateExpense).toHaveBeenCalledWith(
      {
        expenseId: id,
        expenseCategoryId: other,
        amountCentavos: 45_050,
        incurredOn: new Date('2026-09-15T00:00:00.000Z'),
      },
      expect.anything(),
    );
  });

  it('serves the expense report and answers 403 for other Roles', async () => {
    await request(app.getHttpServer())
      .get(
        '/api/v1/administrator/reports/expenses?from=2026-09-01T04:00:00.000Z&until=2026-10-01T04:00:00.000Z',
      )
      .set('authorization', bearer)
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          totalCentavos: 395_050,
          salaryPaymentsCentavos: 350_000,
        }),
      );
    report.expenseReport.mockRejectedValueOnce(
      new BackOfficeError('back_office_access_denied'),
    );
    await request(app.getHttpServer())
      .get(
        '/api/v1/administrator/reports/expenses?from=2026-09-01T04:00:00.000Z&until=2026-10-01T04:00:00.000Z',
      )
      .set('authorization', bearer)
      .expect(403);
  });
});
