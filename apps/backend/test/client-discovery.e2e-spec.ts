import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  BranchCatalogController,
  branchCatalog,
  ClassTypeCatalogController,
  classTypeCatalog,
  ClientProfileController,
  clientProfile,
  clientProfileUpdate,
  clientSubscription,
  PlanCatalogController,
  planCatalog,
  SessionDetailController,
  sessionDetail,
} from '../src/booking/client/client-discovery.controller';
import { classesLeftThisWeekQuery } from '../src/booking/booking-controller-support';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';

describe('client discovery (e2e)', () => {
  let app: INestApplication<App>;
  const bearer = `Bearer ${'a'.repeat(43)}`;
  const planId = '11111111-1111-4111-8111-111111111111';
  const sessionId = '22222222-2222-4222-8222-222222222222';
  const resolvePrincipal =
    jest.fn<
      (
        credential: string,
        meaningfulActivity: boolean,
      ) => Promise<AuthenticatedPrincipal>
    >();
  const findPlan = jest.fn<(id: string) => Promise<unknown>>();
  const findSessionDetail = jest.fn<(id: string) => Promise<unknown>>();

  beforeEach(async () => {
    resolvePrincipal.mockResolvedValue({
      accountId: 'account-id',
      authenticationSessionId: 'authentication-session-id',
      identity: { kind: 'client', clientId: 'client-id' },
    });
    findPlan.mockResolvedValue(null);
    findSessionDetail.mockResolvedValue(null);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        ClientProfileController,
        PlanCatalogController,
        BranchCatalogController,
        ClassTypeCatalogController,
        SessionDetailController,
      ],
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        {
          provide: clientProfile,
          useValue: () =>
            Promise.resolve({
              id: 'client-id',
              name: 'Lucía Fernández',
              email: 'lucia@example.com',
              phone: '+591 70011001',
              referralCode: 'REF-LUCIA',
              photo: null,
            }),
        },
        {
          provide: clientProfileUpdate,
          useValue: (command: { name: string; phone: string | null }) =>
            Promise.resolve({
              id: 'client-id',
              name: command.name,
              email: 'lucia@example.com',
              phone: command.phone,
              referralCode: 'REF-LUCIA',
              photo: null,
            }),
        },
        {
          provide: clientSubscription,
          useValue: () =>
            Promise.resolve({
              status: 'active',
              founderRenewalDeadline: null,
              subscription: {
                id: 'subscription-id',
                planName: 'Paquete de 8 clases',
                originalClassAllowance: 8,
                remainingClassAllowance: 5,
                startsOn: new Date('2026-09-11T00:00:00.000Z'),
                endsOn: new Date('2026-10-11T00:00:00.000Z'),
              },
            }),
        },
        {
          provide: planCatalog,
          useValue: {
            list: () =>
              Promise.resolve([
                {
                  id: planId,
                  name: 'Bimestral 16 clases',
                  durationDays: 60,
                  weeklyClassCap: 3,
                  classAllowance: 16,
                  priceCentavos: 56_000,
                  displayOrder: 0,
                },
              ]),
            find: (planId: string) => findPlan(planId),
          },
        },
        {
          provide: branchCatalog,
          useValue: () =>
            Promise.resolve([
              { id: planId, name: 'Centro', address: 'Calle Ayacucho 245' },
            ]),
        },
        {
          provide: classTypeCatalog,
          useValue: () =>
            Promise.resolve([
              {
                id: planId,
                name: 'Reformer Pilates',
                description: 'Reformer',
                defaultCapacity: 12,
                equipmentNeeds: 'Reformer',
              },
            ]),
        },
        { provide: sessionDetail, useValue: findSessionDetail },
        {
          provide: classesLeftThisWeekQuery,
          useValue: () => Promise.resolve(null),
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

  it('serves the current Client profile', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/clients/current')
      .set('authorization', bearer)
      .expect(200)
      .expect({
        id: 'client-id',
        name: 'Lucía Fernández',
        email: 'lucia@example.com',
        phone: '+591 70011001',
        referralCode: 'REF-LUCIA',
        photo: null,
      });
  });

  it('updates the current Client profile', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/clients/current')
      .set('authorization', bearer)
      .send({ name: 'Lucía F.', phone: null })
      .expect(200)
      .expect({
        id: 'client-id',
        name: 'Lucía F.',
        email: 'lucia@example.com',
        phone: null,
        referralCode: 'REF-LUCIA',
        photo: null,
      });
    await request(app.getHttpServer())
      .patch('/api/v1/clients/current')
      .set('authorization', bearer)
      .send({ name: 'Lucía', email: 'new@example.com' })
      .expect(400)
      .expect(({ body }) => {
        expect(body).toMatchObject({ code: 'invalid_request' });
      });
  });

  it('serves the current Subscription with civil dates', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/clients/current/subscription')
      .set('authorization', bearer)
      .expect(200)
      .expect({
        status: 'active',
        nextSubscription: null,
        founderRenewalDeadline: null,
        freeze: null,
        canRequestFreeze: false,
        subscription: {
          id: 'subscription-id',
          planName: 'Paquete de 8 clases',
          originalClassAllowance: 8,
          remainingClassAllowance: 5,
          startsOn: '2026-09-11',
          endsOn: '2026-10-11',
        },
      });
  });

  it('serves the Plan, Branch, and Class Type catalogs', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/plans')
      .set('authorization', bearer)
      .expect(200)
      .expect([
        {
          id: planId,
          name: 'Bimestral 16 clases',
          durationDays: 60,
          weeklyClassCap: 3,
          // Deprecated (ADR-0016): derived for store builds that read months.
          durationMonths: 2,
          classAllowance: 16,
          priceCentavos: 56_000,
        },
      ]);
    await request(app.getHttpServer())
      .get('/api/v1/branches')
      .set('authorization', bearer)
      .expect(200)
      .expect([{ id: planId, name: 'Centro', address: 'Calle Ayacucho 245' }]);
    await request(app.getHttpServer())
      .get('/api/v1/class-types')
      .set('authorization', bearer)
      .expect(200)
      .expect([
        {
          id: planId,
          name: 'Reformer Pilates',
          description: 'Reformer',
          durationMinutes: 60,
        },
      ]);
  });

  it('returns Problem Details for unknown Plans and Sessions', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/plans/${planId}`)
      .set('authorization', bearer)
      .expect('Content-Type', /application\/problem\+json/)
      .expect(404)
      .expect(({ body }) => {
        expect(body).toMatchObject({ status: 404, code: 'plan_not_found' });
      });
    await request(app.getHttpServer())
      .get(`/api/v1/sessions/${sessionId}`)
      .set('authorization', bearer)
      .expect(404)
      .expect(({ body }) => {
        expect(body).toMatchObject({ code: 'session_not_found' });
      });
  });

  it('requires authentication on every discovery route', async () => {
    for (const path of [
      '/api/v1/clients/current',
      '/api/v1/clients/current/subscription',
      '/api/v1/plans',
      '/api/v1/branches',
      '/api/v1/class-types',
      `/api/v1/sessions/${sessionId}`,
    ]) {
      await request(app.getHttpServer())
        .get(path)
        .expect('Content-Type', /application\/problem\+json/)
        .expect(401);
    }
  });
});
