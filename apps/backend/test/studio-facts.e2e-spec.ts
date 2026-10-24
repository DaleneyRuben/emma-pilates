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
  role: 'administrator' | 'assistant',
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

describe('studio facts endpoint (e2e)', () => {
  let app: INestApplication<App>;
  const resolvePrincipal =
    jest.fn<
      (
        credential: string,
        meaningfulActivity: boolean,
      ) => Promise<AuthenticatedPrincipal>
    >();
  const recompute = jest.fn<
    (
      input: { month: string },
      principal: AuthenticatedPrincipal,
    ) => Promise<{
      month: string;
      sessions: number;
      clientMonths: number;
    }>
  >();

  beforeEach(async () => {
    recompute.mockResolvedValue({
      month: '2026-10',
      sessions: 2,
      clientMonths: 3,
    });
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: studioControllers,
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        {
          provide: studioOperations,
          useValue: {
            recompute: (
              input: { month: string },
              actor: AuthenticatedPrincipal,
            ) => {
              requireStudioAdministrator(actor);
              return recompute(input, actor);
            },
            revenue: () => Promise.reject(new Error('unused')),
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

  it('lets an Administrator recompute a month', async () => {
    resolvePrincipal.mockResolvedValue(principal('administrator'));

    await request(app.getHttpServer())
      .post('/api/v1/administrator/studio-facts/recompute')
      .set('authorization', bearer)
      .send({ month: '2026-10' })
      .expect(200)
      .expect(({ body }) =>
        expect(body).toEqual({
          month: '2026-10',
          sessions: 2,
          clientMonths: 3,
        }),
      );

    expect(recompute).toHaveBeenCalledWith(
      { month: '2026-10' },
      expect.objectContaining({ accountId: 'account' }),
    );
  });

  it('refuses an Assistant', async () => {
    resolvePrincipal.mockResolvedValue(principal('assistant'));

    await request(app.getHttpServer())
      .post('/api/v1/administrator/studio-facts/recompute')
      .set('authorization', bearer)
      .send({ month: '2026-10' })
      .expect(403)
      .expect(({ body }) =>
        expect(body).toEqual(
          expect.objectContaining({ code: 'studio_access_denied' }),
        ),
      );
    expect(recompute).not.toHaveBeenCalled();
  });
});
