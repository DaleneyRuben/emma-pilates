import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
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

const bearer = `Bearer ${'a'.repeat(43)}`;

describe('finance endpoints (e2e)', () => {
  let app: INestApplication<App>;
  const monthResult = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const seedOpeningBudget = jest.fn<(...args: unknown[]) => Promise<unknown>>();

  beforeEach(async () => {
    monthResult.mockResolvedValue({
      month: new Date('2026-09-01T00:00:00.000Z'),
      cashIncomeCentavos: 4_000_000,
      taxRatePercent: 16,
      taxCentavos: 640_000,
      budgetSubtotalCentavos: 1_925_000,
      contingencyCentavos: 192_500,
      budgetTotalCentavos: 2_117_500,
      lines: [
        { name: 'Alquiler', budgetCentavos: 850_000, actualCentavos: 850_000 },
      ],
      nutritionistCostCentavos: 15_000,
      resultCentavos: 2_495_000,
      breakEvenCentavos: 2_538_095,
    });
    seedOpeningBudget.mockResolvedValue({ seeded: true });

    const moduleFixture = await Test.createTestingModule({
      controllers: backOfficeControllers,
      providers: [
        {
          provide: authenticatedPrincipalResolver,
          useValue: jest.fn().mockResolvedValue({
            accountId: 'admin-account',
            authenticationSessionId: 'session',
            identity: {
              kind: 'staff',
              staffMemberId: 'admin',
              role: 'administrator',
              branchIds: [],
            },
          } as never),
        },
        {
          provide: backOfficeOperations,
          useValue: { finance: { monthResult, seedOpeningBudget } },
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
  });

  it('serves the month result and seeds the opening budget', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/administrator/reports/finance?month=2026-09')
      .set('authorization', bearer)
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          month: '2026-09-01',
          cashIncomeCentavos: 4_000_000,
          contingencyPercent: 10,
          breakEvenCentavos: 2_538_095,
        }),
      );
    expect(monthResult).toHaveBeenCalledWith(
      { month: new Date('2026-09-01T00:00:00.000Z') },
      expect.anything(),
    );

    await request(app.getHttpServer())
      .get('/api/v1/administrator/reports/finance?month=2026')
      .set('authorization', bearer)
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/administrator/reports/finance/opening-budget')
      .set('authorization', bearer)
      .expect(200)
      .expect({ seeded: true });

    monthResult.mockRejectedValueOnce(
      new BackOfficeError('back_office_access_denied'),
    );
    await request(app.getHttpServer())
      .get('/api/v1/administrator/reports/finance?month=2026-09')
      .set('authorization', bearer)
      .expect(403);
  });
});
