import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApplication } from '../src/http/configure-application';
import { requireStudioAdministrator } from '../src/studio/studio-errors';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';
import {
  studioControllers,
  studioOperations,
} from '../src/studio/studio.controller';

const bearer = `Bearer ${'a'.repeat(43)}`;

const principal = (
  role: 'administrator' | 'assistant' | 'coordinator',
): AuthenticatedPrincipal => ({
  accountId: 'account',
  authenticationSessionId: 'session',
  identity: {
    kind: 'staff',
    staffMemberId: 'staff',
    role,
    branchIds: [],
  },
});

describe('accrued revenue endpoint (e2e)', () => {
  let app: INestApplication<App>;
  const resolvePrincipal =
    jest.fn<
      (
        credential: string,
        meaningfulActivity: boolean,
      ) => Promise<AuthenticatedPrincipal>
    >();
  const revenue = jest.fn<
    (
      input: { month: string },
      principal: AuthenticatedPrincipal,
    ) => Promise<{
      month: string;
      cashCentavos: number;
      accruedCentavos: number;
      deferredCentavos: number;
      classesStillOwed: number;
    }>
  >();

  beforeEach(async () => {
    revenue.mockResolvedValue({
      month: '2026-10',
      cashCentavos: 30_000,
      accruedCentavos: 12_000,
      deferredCentavos: 27_000,
      classesStillOwed: 5,
    });
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: studioControllers,
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        {
          provide: studioOperations,
          useValue: {
            recompute: () => Promise.reject(new Error('unused')),
            revenue: (
              input: { month: string },
              actor: AuthenticatedPrincipal,
            ) => {
              requireStudioAdministrator(actor);
              return revenue(input, actor);
            },
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

  it('returns cash, accrued, deferred, and classes still owed for an Administrator', async () => {
    resolvePrincipal.mockResolvedValue(principal('administrator'));

    await request(app.getHttpServer())
      .get('/api/v1/administrator/reports/revenue')
      .query({ month: '2026-10' })
      .set('authorization', bearer)
      .expect(200)
      .expect(({ body }) =>
        expect(body).toEqual({
          month: '2026-10',
          cashCentavos: 30_000,
          accruedCentavos: 12_000,
          deferredCentavos: 27_000,
          classesStillOwed: 5,
        }),
      );

    expect(revenue).toHaveBeenCalledWith(
      { month: '2026-10' },
      expect.objectContaining({ accountId: 'account' }),
    );
  });

  it.each(['assistant', 'coordinator'] as const)(
    'refuses a %s',
    async (role) => {
      resolvePrincipal.mockResolvedValue(principal(role));

      await request(app.getHttpServer())
        .get('/api/v1/administrator/reports/revenue')
        .query({ month: '2026-10' })
        .set('authorization', bearer)
        .expect(403)
        .expect(({ body }) =>
          expect(body).toEqual(
            expect.objectContaining({ code: 'studio_access_denied' }),
          ),
        );
      expect(revenue).not.toHaveBeenCalled();
    },
  );
});
