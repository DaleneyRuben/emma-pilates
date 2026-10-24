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
import {
  dismissRecommendation,
  readRecommendations,
  recomputeRecommendations,
} from '../src/studio/prisma-recommendations';
import {
  studioControllers,
  studioOperations,
} from '../src/studio/studio.controller';
import { createStudioOperations as createStudioOperationsUntyped } from '../src/studio/studio.module';

type RecommendationOperation = (
  input: { month: string },
  principal: AuthenticatedPrincipal,
  prisma: PrismaClient,
) => Promise<unknown>;

const createStudioOperations = createStudioOperationsUntyped as (deps: {
  readRecommendations: typeof readRecommendations;
  recomputeRecommendations: typeof recomputeRecommendations;
  dismissRecommendation: typeof dismissRecommendation;
}) => {
  list: RecommendationOperation;
  recomputeRecommendations: RecommendationOperation;
  dismiss: (
    input: { id: string },
    principal: AuthenticatedPrincipal,
    prisma: PrismaClient,
  ) => Promise<unknown>;
};

const bearer = `Bearer ${'a'.repeat(43)}`;

const principal = (
  role: 'administrator' | 'assistant' | 'coordinator',
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

const finding = {
  id: '11111111-1111-4111-8111-111111111111',
  rule: 'weak_schedule',
  subject: 'trainer:2',
  period: '2026-10-01',
  detail: 'Revisa el horario del martes: promedia 1,7 alumnas.',
  state: 'new',
};

describe('recommendations endpoint (e2e)', () => {
  let app: INestApplication<App>;
  const resolvePrincipal =
    jest.fn<
      (
        credential: string,
        meaningfulActivity: boolean,
      ) => Promise<AuthenticatedPrincipal>
    >();
  const read = jest.fn<typeof readRecommendations>();
  const recompute = jest.fn<typeof recomputeRecommendations>();
  const dismiss = jest.fn<typeof dismissRecommendation>();

  beforeEach(async () => {
    read.mockResolvedValue([finding]);
    recompute.mockResolvedValue({ written: 1 });
    dismiss.mockResolvedValue({ ...finding, state: 'dismissed' });
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: studioControllers,
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        {
          provide: studioOperations,
          useFactory: () => {
            const operations = createStudioOperations({
              readRecommendations: read,
              recomputeRecommendations: recompute,
              dismissRecommendation: dismiss,
            });
            return {
              recompute: () => Promise.reject(new Error('unused')),
              revenue: () => Promise.reject(new Error('unused')),
              kpis: () => Promise.reject(new Error('unused')),
              recommendations: (
                input: { month: string },
                actor: AuthenticatedPrincipal,
              ) => operations.list(input, actor, {} as never),
              recomputeRecommendations: (
                input: { month: string },
                actor: AuthenticatedPrincipal,
              ) =>
                operations.recomputeRecommendations(input, actor, {} as never),
              dismissRecommendation: (
                input: { id: string },
                actor: AuthenticatedPrincipal,
              ) => operations.dismiss(input, actor, {} as never),
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

  it('lists the month for an Administrator and a Coordinator', async () => {
    resolvePrincipal.mockResolvedValue(principal('administrator'));

    await request(app.getHttpServer())
      .get('/api/v1/administrator/recommendations')
      .query({ month: '2026-10' })
      .set('authorization', bearer)
      .expect(200)
      .expect(({ body }) =>
        expect(body).toEqual({ month: '2026-10', recommendations: [finding] }),
      );

    resolvePrincipal.mockResolvedValue(principal('coordinator'));
    await request(app.getHttpServer())
      .get('/api/v1/administrator/recommendations')
      .query({ month: '2026-10' })
      .set('authorization', bearer)
      .expect(200)
      .expect(({ body }: { body: Record<string, unknown> }) => {
        expect(body).toEqual({ month: '2026-10', recommendations: [finding] });
        expect(JSON.stringify(body)).not.toMatch(/[Cc]entavos|boliviano|Bs/);
      });
  });

  it('refuses an Assistant', async () => {
    resolvePrincipal.mockResolvedValue(principal('assistant'));

    await request(app.getHttpServer())
      .get('/api/v1/administrator/recommendations')
      .query({ month: '2026-10' })
      .set('authorization', bearer)
      .expect(403)
      .expect(({ body }) =>
        expect(body).toEqual(
          expect.objectContaining({ code: 'studio_access_denied' }),
        ),
      );
    expect(read).not.toHaveBeenCalled();
  });

  it('recomputes for an Administrator and refuses a Coordinator', async () => {
    resolvePrincipal.mockResolvedValue(principal('administrator'));

    await request(app.getHttpServer())
      .post('/api/v1/administrator/recommendations/recompute')
      .set('authorization', bearer)
      .send({ month: '2026-10' })
      .expect(200)
      .expect(({ body }) =>
        expect(body).toEqual({ month: '2026-10', written: 1 }),
      );

    resolvePrincipal.mockResolvedValue(principal('coordinator'));
    await request(app.getHttpServer())
      .post('/api/v1/administrator/recommendations/recompute')
      .set('authorization', bearer)
      .send({ month: '2026-10' })
      .expect(403)
      .expect(({ body }) =>
        expect(body).toEqual(
          expect.objectContaining({ code: 'studio_access_denied' }),
        ),
      );
  });

  it('dismisses for an Administrator and refuses a Coordinator', async () => {
    resolvePrincipal.mockResolvedValue(principal('administrator'));

    await request(app.getHttpServer())
      .post(`/api/v1/administrator/recommendations/${finding.id}/dismiss`)
      .set('authorization', bearer)
      .expect(200)
      .expect(({ body }) =>
        expect(body).toEqual({ ...finding, state: 'dismissed' }),
      );

    resolvePrincipal.mockResolvedValue(principal('coordinator'));
    await request(app.getHttpServer())
      .post(`/api/v1/administrator/recommendations/${finding.id}/dismiss`)
      .set('authorization', bearer)
      .expect(403);
  });

  it('answers 404 when the finding is gone', async () => {
    resolvePrincipal.mockResolvedValue(principal('administrator'));
    dismiss.mockResolvedValue(null);

    await request(app.getHttpServer())
      .post(`/api/v1/administrator/recommendations/${finding.id}/dismiss`)
      .set('authorization', bearer)
      .expect(404)
      .expect(({ body }) =>
        expect(body).toEqual(
          expect.objectContaining({ code: 'resource_not_found' }),
        ),
      );
  });
});
