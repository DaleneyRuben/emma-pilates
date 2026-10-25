import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  administrationControllers,
  administrationOperations,
} from '../src/booking/administration/administration.controller';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';

const bearer = `Bearer ${'a'.repeat(43)}`;
const id = '11111111-1111-4111-8111-111111111111';

type Operation = jest.Mock<(...args: unknown[]) => Promise<unknown>>;
const operation = (): Operation =>
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

// AW04/AW05: Plans by days with an optional Weekly Cap (booking ADR-0005,
// ADR-0006); the response still carries the months old builds read.
describe('administrator Plan endpoints (e2e)', () => {
  let app: INestApplication<App>;
  const resolvePrincipal =
    jest.fn<
      (
        credential: string,
        meaningfulActivity: boolean,
      ) => Promise<AuthenticatedPrincipal>
    >();
  const catalog = {
    createPlan: operation(),
    updatePlan: operation(),
    setPlanVisibility: operation(),
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
    catalog.setPlanVisibility.mockResolvedValue({
      id,
      name: 'Paquete de 8 clases',
      durationDays: 30,
      weeklyClassCap: null,
      classAllowance: 8,
      priceCentavos: 56_000,
      displayOrder: 0,
      hiddenAt: new Date('2026-09-23T12:00:00.000Z'),
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: administrationControllers,
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        {
          provide: administrationOperations,
          useValue: { catalog, schedules: {}, oversight: {} },
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

  it('creates a Plan by days with a Weekly Cap and derives the old months', async () => {
    catalog.createPlan.mockResolvedValue({
      id,
      name: 'Bimestral 16 clases',
      durationDays: 60,
      weeklyClassCap: 3,
      classAllowance: 16,
      priceCentavos: 112_000,
      displayOrder: 4,
      hiddenAt: null,
    });
    const input = {
      name: 'Bimestral 16 clases',
      durationDays: 60,
      weeklyClassCap: 3,
      classAllowance: 16,
      priceCentavos: 112_000,
      displayOrder: 4,
    };
    await request(app.getHttpServer())
      .post('/api/v1/administrator/plans')
      .set('authorization', bearer)
      .send(input)
      .expect(201)
      .expect(({ body }) =>
        expect(body).toEqual({
          id,
          ...input,
          durationMonths: 2,
          hiddenAt: null,
        }),
      );
    expect(catalog.createPlan).toHaveBeenCalledWith(input, expect.anything());
    await request(app.getHttpServer())
      .post('/api/v1/administrator/plans')
      .set('authorization', bearer)
      .send({ ...input, durationDays: 45 })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/administrator/plans')
      .set('authorization', bearer)
      .send({ ...input, durationDays: 30, weeklyClassCap: 3 })
      .expect(400);
  });

  it('hides a Plan', async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/administrator/plans/${id}/visibility`)
      .set('authorization', bearer)
      .send({ visible: false })
      .expect(200)
      .expect(({ body }: { body: { hiddenAt: string } }) =>
        expect(body.hiddenAt).toBe('2026-09-23T12:00:00.000Z'),
      );
    expect(catalog.setPlanVisibility).toHaveBeenCalledWith(
      { planId: id, visible: false },
      expect.anything(),
    );
  });
});
