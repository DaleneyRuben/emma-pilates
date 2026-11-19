import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  backOfficeControllers,
  backOfficeOperations,
} from '../src/back-office/back-office.controller';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';
import { OBJECT_STORAGE } from '../src/uploads/object-storage.module';

const bearer = `Bearer ${'a'.repeat(43)}`;
const id = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const expense = {
  id,
  branchId: other,
  expenseCategoryId: other,
  expenseCategoryName: 'Limpieza',
  amountCentavos: 18_000,
  incurredOn: new Date('2026-11-15T00:00:00.000Z'),
  detail: 'Productos de limpieza',
  voidedAt: null,
  voidedByName: null,
  voidReason: null,
};

type Operation = jest.Mock<(...args: unknown[]) => Promise<unknown>>;
const operation = (): Operation =>
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

// W11 A (owner 2026-11-19): an Expense carries an optional free-text detail,
// «Productos de limpieza», shown in the Gastos «Detalle» column.
describe('expense detail (e2e)', () => {
  let app: INestApplication<App>;
  const resolvePrincipal =
    jest.fn<
      (
        credential: string,
        meaningfulActivity: boolean,
      ) => Promise<AuthenticatedPrincipal>
    >();
  const expenses = {
    recordExpense: operation(),
    updateExpense: operation(),
    listExpenses: operation(),
  };

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
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: backOfficeControllers,
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        { provide: OBJECT_STORAGE, useValue: { get: jest.fn() } },
        { provide: backOfficeOperations, useValue: { expenses } },
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

  const record = (body: object) =>
    request(app.getHttpServer())
      .post('/api/v1/administrator/expenses')
      .set('authorization', bearer)
      .set('idempotency-key', '33333333-3333-4333-8333-333333333333')
      .send({
        branchId: other,
        expenseCategoryId: other,
        amountCentavos: 18_000,
        incurredOn: '2026-11-15',
        ...body,
      });

  it('records a trimmed detail and answers it', async () => {
    expenses.recordExpense.mockResolvedValue(expense);
    await record({ detail: '  Productos de limpieza  ' })
      .expect(201)
      .expect(({ body }) =>
        expect((body as { detail: string }).detail).toBe(
          'Productos de limpieza',
        ),
      );
    expect(expenses.recordExpense).toHaveBeenCalledWith(
      expect.objectContaining({ detail: 'Productos de limpieza' }),
      expect.anything(),
      expect.any(String),
    );
  });

  it('keeps recording without a detail, as the earlier admin web does', async () => {
    expenses.recordExpense.mockResolvedValue({ ...expense, detail: null });
    await record({}).expect(201);
    expect(expenses.recordExpense).toHaveBeenCalledWith(
      {
        branchId: other,
        expenseCategoryId: other,
        amountCentavos: 18_000,
        incurredOn: new Date('2026-11-15T00:00:00.000Z'),
      },
      expect.anything(),
      expect.any(String),
    );
  });

  it('refuses a detail longer than 120 characters', async () => {
    await record({ detail: 'x'.repeat(121) }).expect(400);
    expect(expenses.recordExpense).not.toHaveBeenCalled();
  });

  it('clears the detail when an edit sends it blank, and keeps it when absent', async () => {
    expenses.updateExpense.mockResolvedValue({ ...expense, detail: null });
    const update = (body: object) =>
      request(app.getHttpServer())
        .put(`/api/v1/administrator/expenses/${id}`)
        .set('authorization', bearer)
        .send({
          expenseCategoryId: other,
          amountCentavos: 18_000,
          incurredOn: '2026-11-15',
          ...body,
        });
    await update({ detail: '   ' }).expect(200);
    expect(expenses.updateExpense).toHaveBeenLastCalledWith(
      expect.objectContaining({ expenseId: id, detail: null }),
      expect.anything(),
    );
    await update({ detail: null }).expect(200);
    expect(expenses.updateExpense).toHaveBeenLastCalledWith(
      expect.objectContaining({ detail: null }),
      expect.anything(),
    );
    await update({}).expect(200);
    expect(expenses.updateExpense).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ detail: expect.anything() as unknown }),
      expect.anything(),
    );
  });
});
