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
import { readMonthKpis } from '../src/studio/prisma-month-kpis';
import {
  readRecommendations,
  type StoredRecommendation,
} from '../src/studio/prisma-recommendations';
import {
  studioControllers,
  studioOperations,
} from '../src/studio/studio.controller';
import { createStudioOperations } from '../src/studio/studio.module';

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

const counts = {
  sessionsHeld: 20,
  occupancyPercent: 59,
  averageStudentsTimes10: 65,
  averageAttendanceTimes10: 55,
  noShowPercent: 15,
  activeClients: 8,
  newClients: 1,
  renewedClients: 4,
  renewalPercent: 50,
};

const finding: StoredRecommendation = {
  id: '11111111-1111-4111-8111-111111111111',
  rule: 'inactive_client',
  subject: '11111111-1111-4111-8111-111111111111',
  period: '2026-10-01',
  detail: 'Contacta a la clienta: tiene un plan vigente y no reservó este mes.',
  state: 'new',
};

describe('narrative report endpoint (e2e)', () => {
  let app: INestApplication<App>;
  const resolvePrincipal =
    jest.fn<
      (
        credential: string,
        meaningfulActivity: boolean,
      ) => Promise<AuthenticatedPrincipal>
    >();
  const kpis = jest.fn<typeof readMonthKpis>();
  const recommendations = jest.fn<typeof readRecommendations>();

  beforeEach(async () => {
    kpis.mockResolvedValue(counts);
    recommendations.mockResolvedValue([finding]);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: studioControllers,
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        {
          provide: studioOperations,
          useFactory: () => {
            const operations = createStudioOperations({
              readKpis: kpis,
              readRecommendations: recommendations,
              readRevenue: () => Promise.reject(new Error('unused')),
              recomputeRecommendations: () => Promise.resolve({ written: 0 }),
              dismissRecommendation: () => Promise.resolve(null),
            });
            return {
              recompute: () => Promise.reject(new Error('unused')),
              revenue: () => Promise.reject(new Error('unused')),
              kpis: (input: { month: string }, actor: AuthenticatedPrincipal) =>
                operations.kpis(input, actor, {} as never),
              recommendations: (
                input: { month: string },
                actor: AuthenticatedPrincipal,
              ) => operations.list(input, actor, {} as never),
              recomputeRecommendations: () =>
                Promise.reject(new Error('unused')),
              dismissRecommendation: () => Promise.reject(new Error('unused')),
              narrative: (
                input: { month: string },
                actor: AuthenticatedPrincipal,
              ) => operations.narrative(input, actor, {} as never),
              question: (
                input: { month: string; question: string },
                actor: AuthenticatedPrincipal,
              ) => operations.question(input, actor, {} as never),
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

  it('narrates the month for an Administrator from the existing reads', async () => {
    resolvePrincipal.mockResolvedValue(principal('administrator'));

    await request(app.getHttpServer())
      .get('/api/v1/administrator/reports/narrative')
      .query({ month: '2026-10' })
      .set('authorization', bearer)
      .expect(200)
      .expect(({ body }: { body: Record<string, unknown> }) => {
        const text = JSON.stringify(body);
        expect(text).toContain('20');
        expect(text).toContain('59');
        expect(text).toContain('8');
        expect(text).toContain(finding.detail);
        expect(text).not.toContain(finding.subject);
        expect(text).not.toMatch(/[Cc]entavos/);
      });

    expect(kpis).toHaveBeenCalled();
    expect(recommendations).toHaveBeenCalled();
  });

  it.each(['coordinator', 'assistant'] as const)(
    'refuses a %s',
    async (role) => {
      resolvePrincipal.mockResolvedValue(principal(role));

      await request(app.getHttpServer())
        .get('/api/v1/administrator/reports/narrative')
        .query({ month: '2026-10' })
        .set('authorization', bearer)
        .expect(403)
        .expect(({ body }) =>
          expect(body).toEqual(
            expect.objectContaining({ code: 'studio_access_denied' }),
          ),
        );
      expect(kpis).not.toHaveBeenCalled();
    },
  );

  it('answers a fixed question and refuses a name', async () => {
    resolvePrincipal.mockResolvedValue(principal('administrator'));

    await request(app.getHttpServer())
      .post('/api/v1/administrator/reports/narrative/questions')
      .set('authorization', bearer)
      .send({ month: '2026-10', question: '¿Cuál es la ocupación?' })
      .expect(200)
      .expect(({ body }: { body: { refused: boolean; answer: string } }) =>
        expect(body).toEqual({
          refused: false,
          answer: expect.stringContaining('59') as string,
        }),
      );

    await request(app.getHttpServer())
      .post('/api/v1/administrator/reports/narrative/questions')
      .set('authorization', bearer)
      .send({ month: '2026-10', question: '¿Cómo le fue a Ana Mendoza?' })
      .expect(200)
      .expect(({ body }: { body: { refused: boolean; answer: string } }) => {
        expect(body.refused).toBe(true);
        expect(body.answer).not.toContain('Ana');
      });
  });

  it('refuses an empty or oversized question and a bad month', async () => {
    resolvePrincipal.mockResolvedValue(principal('administrator'));

    await request(app.getHttpServer())
      .post('/api/v1/administrator/reports/narrative/questions')
      .set('authorization', bearer)
      .send({ month: '2026-10', question: '   ' })
      .expect(400)
      .expect(({ body }) =>
        expect(body).toEqual(
          expect.objectContaining({ code: 'invalid_request' }),
        ),
      );

    await request(app.getHttpServer())
      .post('/api/v1/administrator/reports/narrative/questions')
      .set('authorization', bearer)
      .send({ month: '2026-10', question: 'a'.repeat(201) })
      .expect(400);

    await request(app.getHttpServer())
      .get('/api/v1/administrator/reports/narrative')
      .query({ month: '2026-13' })
      .set('authorization', bearer)
      .expect(400);
  });
});
