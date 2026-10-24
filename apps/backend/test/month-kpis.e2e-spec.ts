import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';
import type { PrismaClient } from '../src/generated/prisma/client';
import { readMonthKpis } from '../src/studio/prisma-month-kpis';
import { readRevenueMonth } from '../src/studio/prisma-revenue-report';
import {
  studioControllers,
  studioOperations,
} from '../src/studio/studio.controller';
import { createStudioOperations as createStudioOperationsUntyped } from '../src/studio/studio.module';

type KpiOperation = (
  input: { month: string },
  principal: AuthenticatedPrincipal,
  prisma: PrismaClient,
) => Promise<Record<string, unknown>>;

const createStudioOperations = createStudioOperationsUntyped as (deps: {
  readKpis: typeof readMonthKpis;
  readRevenue: typeof readRevenueMonth;
  readRecommendations: () => Promise<never[]>;
  recomputeRecommendations: () => Promise<{ written: number }>;
  dismissRecommendation: () => Promise<null>;
}) => { kpis: KpiOperation };

const bearer = `Bearer ${'a'.repeat(43)}`;

const principal = (
  role: 'administrator' | 'assistant' | 'trainer' | 'coordinator',
): AuthenticatedPrincipal =>
  ({
    accountId: 'account',
    authenticationSessionId: 'session',
    identity: {
      kind: 'staff',
      staffMemberId: 'staff',
      role,
      branchIds: [],
    },
  }) as AuthenticatedPrincipal;

const counts = {
  sessionsHeld: 2,
  occupancyPercent: 59,
  averageStudentsTimes10: 65,
  averageAttendanceTimes10: 55,
  noShowPercent: 15,
  activeClients: 2,
  newClients: 1,
  renewedClients: 1,
  renewalPercent: 50,
};

const amounts = {
  cashCentavos: 30_000,
  accruedCentavos: 12_000,
  deferredCentavos: 27_000,
  classesStillOwed: 5,
};

describe('month kpi endpoint (e2e)', () => {
  let app: INestApplication<App>;
  const resolvePrincipal =
    jest.fn<
      (
        credential: string,
        meaningfulActivity: boolean,
      ) => Promise<AuthenticatedPrincipal>
    >();
  const kpis = jest.fn<typeof readMonthKpis>();
  const revenue = jest.fn<typeof readRevenueMonth>();

  beforeEach(async () => {
    kpis.mockResolvedValue(counts);
    revenue.mockResolvedValue(amounts);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: studioControllers,
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        {
          provide: studioOperations,
          useFactory: () => {
            const operations = createStudioOperations({
              readKpis: kpis,
              readRevenue: revenue,
              readRecommendations: () => Promise.resolve([]),
              recomputeRecommendations: () => Promise.resolve({ written: 0 }),
              dismissRecommendation: () => Promise.resolve(null),
            });
            return {
              recompute: () => Promise.reject(new Error('unused')),
              revenue: () => Promise.reject(new Error('unused')),
              kpis: (input: { month: string }, actor: AuthenticatedPrincipal) =>
                operations.kpis(input, actor, {} as never),
            };
          },
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

  it('returns counts and amounts for an Administrator', async () => {
    resolvePrincipal.mockResolvedValue(principal('administrator'));

    await request(app.getHttpServer())
      .get('/api/v1/administrator/reports/kpis')
      .query({ month: '2026-10' })
      .set('authorization', bearer)
      .expect(200)
      .expect(({ body }) =>
        expect(body).toEqual({ month: '2026-10', ...counts, ...amounts }),
      );

    expect(revenue).toHaveBeenCalled();
  });

  it('returns counts only for a Coordinator and no centavo key', async () => {
    resolvePrincipal.mockResolvedValue(principal('coordinator'));

    await request(app.getHttpServer())
      .get('/api/v1/administrator/reports/kpis')
      .query({ month: '2026-10' })
      .set('authorization', bearer)
      .expect(200)
      .expect(({ body }: { body: Record<string, unknown> }) => {
        expect(body).toEqual({ month: '2026-10', ...counts });
        expect(JSON.stringify(body)).not.toMatch(/[Cc]entavos/);
        expect(body).not.toHaveProperty('classesStillOwed');
      });

    expect(revenue).not.toHaveBeenCalled();
  });

  it.each(['assistant', 'trainer'] as const)('refuses a %s', async (role) => {
    resolvePrincipal.mockResolvedValue(principal(role));

    await request(app.getHttpServer())
      .get('/api/v1/administrator/reports/kpis')
      .query({ month: '2026-10' })
      .set('authorization', bearer)
      .expect(403)
      .expect(({ body }) =>
        expect(body).toEqual(
          expect.objectContaining({ code: 'studio_access_denied' }),
        ),
      );
    expect(kpis).not.toHaveBeenCalled();
  });

  it('refuses a month that is not YYYY-MM', async () => {
    resolvePrincipal.mockResolvedValue(principal('administrator'));

    await request(app.getHttpServer())
      .get('/api/v1/administrator/reports/kpis')
      .query({ month: '2026-13' })
      .set('authorization', bearer)
      .expect(400)
      .expect(({ body }) =>
        expect(body).toEqual(
          expect.objectContaining({ code: 'invalid_request' }),
        ),
      );
  });
});
