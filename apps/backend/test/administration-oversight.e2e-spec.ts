import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { administrationOperations } from '../src/booking/administration/administration-http';
import { AdministratorOversightController } from '../src/booking/administration/oversight.controller';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';

const bearer = `Bearer ${'a'.repeat(43)}`;
const centro = '11111111-1111-4111-8111-111111111111';
const range = 'from=2026-09-21T04:00:00.000Z&until=2026-09-28T04:00:00.000Z';

type Operation = jest.Mock<(...args: unknown[]) => Promise<unknown>>;
const operation = (): Operation =>
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

// WEB-008: the oversight reads AW25–AW27 page through, allowlisted and never
// cached (ADR-0062, ADR-0063).
describe('administration oversight endpoints (e2e)', () => {
  let app: INestApplication<App>;
  const oversight = {
    listEvaluations: operation(),
    listReferrals: operation(),
    incomeReport: operation(),
  };
  const principal: AuthenticatedPrincipal = {
    accountId: 'admin-account',
    authenticationSessionId: 'session',
    identity: {
      kind: 'staff',
      staffMemberId: 'admin',
      role: 'administrator',
      branchIds: [],
    },
  };

  beforeEach(async () => {
    oversight.listEvaluations.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      totalItems: 0,
    });
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AdministratorOversightController],
      providers: [
        {
          provide: authenticatedPrincipalResolver,
          useValue: jest
            .fn<() => Promise<AuthenticatedPrincipal>>()
            .mockResolvedValue(principal),
        },
        {
          provide: administrationOperations,
          useValue: { oversight, cancelEvaluation: operation() },
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

  it('no longer serves the retired Credit list (PAY-005)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/administrator/credits')
      .set('authorization', bearer)
      .expect(404);
  });

  it('narrows the Evaluation list to one Branch without caching it', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/administrator/evaluations?${range}&branchId=${centro}`)
      .set('authorization', bearer)
      .expect(200)
      .expect('Cache-Control', 'no-store');

    expect(oversight.listEvaluations).toHaveBeenCalledWith(
      {
        from: new Date('2026-09-21T04:00:00.000Z'),
        until: new Date('2026-09-28T04:00:00.000Z'),
        branchId: centro,
        page: 1,
        pageSize: 20,
      },
      principal,
    );
  });

  it('refuses a Branch that is not an identifier and an unknown filter', async () => {
    for (const filter of ['branchId=centro', 'status=booked']) {
      await request(app.getHttpServer())
        .get(`/api/v1/administrator/evaluations?${range}&${filter}`)
        .set('authorization', bearer)
        .expect(400)
        .expect(({ body }: { body: { code: string } }) =>
          expect(body.code).toBe('invalid_request'),
        );
    }
    expect(oversight.listEvaluations).not.toHaveBeenCalled();
  });
});
