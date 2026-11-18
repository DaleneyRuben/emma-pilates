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
import { OBJECT_STORAGE } from '../src/uploads/object-storage.module';

const bearer = `Bearer ${'a'.repeat(43)}`;
const id = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const voided = {
  id,
  branchId: other,
  expenseCategoryId: other,
  expenseCategoryName: 'Luz',
  amountCentavos: 35_000,
  incurredOn: new Date('2026-11-17T00:00:00.000Z'),
  voidedAt: new Date('2026-11-18T18:30:00.000Z'),
  voidedByName: 'Paola Mendoza',
  voidReason: null,
};

type Operation = jest.Mock<(...args: unknown[]) => Promise<unknown>>;
const operation = (): Operation =>
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

// Finding 104: «Eliminar gasto» voids the Expense through its own command.
describe('expense void endpoint (e2e)', () => {
  let app: INestApplication<App>;
  const resolvePrincipal =
    jest.fn<
      (
        credential: string,
        meaningfulActivity: boolean,
      ) => Promise<AuthenticatedPrincipal>
    >();
  const expenses = { voidExpense: operation() };

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

  it('voids an Expense with an optional reason and answers the marked row', async () => {
    expenses.voidExpense.mockResolvedValue(voided);
    await request(app.getHttpServer())
      .post(`/api/v1/administrator/expenses/${id}/void`)
      .set('authorization', bearer)
      .send({})
      .expect(200)
      .expect(({ body }) =>
        expect(body).toEqual({
          ...voided,
          incurredOn: '2026-11-17',
          voidedAt: '2026-11-18T18:30:00.000Z',
        }),
      );
    expect(expenses.voidExpense).toHaveBeenCalledWith(
      { expenseId: id },
      expect.anything(),
    );

    await request(app.getHttpServer())
      .post(`/api/v1/administrator/expenses/${id}/void`)
      .set('authorization', bearer)
      .send({ reason: 'Cargado dos veces' })
      .expect(200);
    expect(expenses.voidExpense).toHaveBeenLastCalledWith(
      { expenseId: id, reason: 'Cargado dos veces' },
      expect.anything(),
    );
  });

  it('refuses an unknown field and maps an Expense already voided', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/administrator/expenses/${id}/void`)
      .set('authorization', bearer)
      .send({ amountCentavos: 1 })
      .expect(400);
    expenses.voidExpense.mockRejectedValue(
      new BackOfficeError('expense_voided'),
    );
    await request(app.getHttpServer())
      .post(`/api/v1/administrator/expenses/${id}/void`)
      .set('authorization', bearer)
      .send({})
      .expect(409)
      .expect(({ body }) =>
        expect((body as { code: string }).code).toBe('expense_voided'),
      );
  });
});
