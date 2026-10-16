import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { AdministrationError } from '../src/booking/administration/administration-errors';
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
const other = '22222222-2222-4222-8222-222222222222';
const branch = { id, name: 'Centro', address: 'Calle 1', archivedAt: null };
const schedule = {
  id,
  branchId: id,
  classTypeId: other,
  trainerStaffMemberId: other,
  weekday: 3,
  startsAtLocal: new Date('1970-01-01T12:00:00.000Z'),
  capacity: 10,
  effectiveFrom: new Date('2026-09-22T00:00:00.000Z'),
  effectiveUntil: null,
  durationMinutes: 50,
  classType: { name: 'Mat Pilates' },
};
const session = {
  id,
  sessionScheduleId: null,
  branchId: id,
  classTypeId: other,
  trainerStaffMemberId: other,
  startsAt: new Date('2026-09-26T19:00:00.000Z'),
  endsAt: new Date('2026-09-26T19:50:00.000Z'),
  capacity: 8,
  state: 'SCHEDULED',
  isException: true,
};

type Operation = jest.Mock<(...args: unknown[]) => Promise<unknown>>;
const operation = (): Operation =>
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

describe('administration endpoints (e2e)', () => {
  let app: INestApplication<App>;
  const resolvePrincipal =
    jest.fn<
      (
        credential: string,
        meaningfulActivity: boolean,
      ) => Promise<AuthenticatedPrincipal>
    >();
  const catalog = {
    createBranch: operation(),
    updateBranch: operation(),
    archiveBranch: operation(),
    createClassType: operation(),
    updateClassType: operation(),
    archiveClassType: operation(),
    createPlan: operation(),
    updatePlan: operation(),
    setPlanVisibility: operation(),
  };
  const schedules = {
    listSchedules: operation(),
    createSchedule: operation(),
    createSchedules: operation(),
    replaceSchedule: operation(),
    endSchedule: operation(),
    createSession: operation(),
    updateSession: operation(),
  };
  const oversight = {
    listEvaluations: operation(),
    listReferrals: operation(),
    listCredits: operation(),
    incomeReport: operation(),
  };
  const cancelEvaluation = operation();

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
    catalog.createBranch.mockResolvedValue(branch);
    catalog.archiveBranch.mockRejectedValue(
      new AdministrationError('branch_in_use'),
    );
    catalog.setPlanVisibility.mockResolvedValue({
      id,
      name: 'Paquete de 8 clases',
      durationMonths: 1,
      classAllowance: 8,
      priceCentavos: 56_000,
      displayOrder: 0,
      hiddenAt: new Date('2026-09-23T12:00:00.000Z'),
    });
    schedules.createSchedule.mockResolvedValue({
      schedule,
      created: 5,
      skipped: 0,
    });
    schedules.updateSession.mockResolvedValue(session);
    schedules.createSession.mockResolvedValue(session);
    oversight.incomeReport.mockResolvedValue({
      from: new Date('2026-09-01T04:00:00.000Z'),
      until: new Date('2026-10-01T04:00:00.000Z'),
      branchId: null,
      totalCentavos: 78_000,
      byMethod: { cash: 78_000, transfer: 0, credit_only: 0 },
      months: [{ month: '2026-09-01', totalCentavos: 78_000 }],
      generatedAt: new Date('2026-09-23T12:00:00.000Z'),
    });
    oversight.listReferrals.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      totalItems: 0,
    });
    cancelEvaluation.mockResolvedValue(undefined);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: administrationControllers,
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        {
          provide: administrationOperations,
          useValue: { catalog, schedules, oversight, cancelEvaluation },
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

  it('manages Branches with validation and stable conflict codes', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/administrator/branches')
      .set('authorization', bearer)
      .send({ name: 'Centro', address: 'Calle 1' })
      .expect(201)
      .expect('Cache-Control', 'no-store')
      .expect(({ body }) => expect(body).toEqual({ ...branch }));
    await request(app.getHttpServer())
      .post('/api/v1/administrator/branches')
      .set('authorization', bearer)
      .send({ name: '' })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/api/v1/administrator/branches/${id}/archive`)
      .set('authorization', bearer)
      .expect(409)
      .expect(({ body }: { body: { code: string } }) =>
        expect(body.code).toBe('branch_in_use'),
      );
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

  it('creates a weekly schedule from a civil date and reports its occurrences', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/administrator/session-schedules')
      .set('authorization', bearer)
      .send({
        branchId: id,
        classTypeId: other,
        trainerStaffMemberId: other,
        weekday: 3,
        startsAtLocal: '12:00',
        durationMinutes: 50,
        capacity: 10,
        effectiveFrom: '2026-09-22',
      })
      .expect(201)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          schedule: {
            id,
            startsAtLocal: '12:00',
            effectiveFrom: '2026-09-22',
            effectiveUntil: null,
          },
          created: 5,
          skipped: 0,
        }),
      );
    expect(schedules.createSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        effectiveFrom: new Date('2026-09-22T00:00:00.000Z'),
      }),
      expect.anything(),
    );
    await request(app.getHttpServer())
      .post('/api/v1/administrator/session-schedules')
      .set('authorization', bearer)
      .send({ weekday: 9 })
      .expect(400);
  });

  it('creates several weekly rows together and maps a repeated row to a conflict', async () => {
    schedules.createSchedules.mockResolvedValueOnce({
      schedules: [
        { schedule, created: 5, skipped: 0 },
        { schedule: { ...schedule, weekday: 5 }, created: 4, skipped: 1 },
      ],
    });
    const rows = [
      { weekday: 3, startsAtLocal: '12:00', durationMinutes: 50 },
      { weekday: 5, startsAtLocal: '12:00', durationMinutes: 50 },
    ];
    await request(app.getHttpServer())
      .post('/api/v1/administrator/session-schedules/batch')
      .set('authorization', bearer)
      .send({
        branchId: id,
        classTypeId: other,
        trainerStaffMemberId: other,
        capacity: 10,
        effectiveFrom: '2026-09-22',
        rows,
      })
      .expect(201)
      .expect(({ body }: { body: { schedules: unknown[] } }) =>
        expect(body.schedules).toMatchObject([
          { schedule: { weekday: 3, startsAtLocal: '12:00' }, created: 5 },
          { schedule: { weekday: 5 }, created: 4, skipped: 1 },
        ]),
      );
    expect(schedules.createSchedules).toHaveBeenCalledWith(
      expect.objectContaining({
        rows,
        effectiveFrom: new Date('2026-09-22T00:00:00.000Z'),
      }),
      expect.anything(),
    );

    const base = {
      branchId: id,
      classTypeId: other,
      trainerStaffMemberId: other,
      capacity: 10,
      effectiveFrom: '2026-09-22',
    };
    await request(app.getHttpServer())
      .post('/api/v1/administrator/session-schedules/batch')
      .set('authorization', bearer)
      .send({ ...base, rows: [] })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/administrator/session-schedules/batch')
      .set('authorization', bearer)
      .send({ ...base, rows: Array.from({ length: 8 }, () => rows[0]) })
      .expect(400);

    schedules.createSchedules.mockRejectedValueOnce(
      new AdministrationError('schedule_rows_overlap', 'Row 2 repeats row 1'),
    );
    await request(app.getHttpServer())
      .post('/api/v1/administrator/session-schedules/batch')
      .set('authorization', bearer)
      .send({ ...base, rows: [rows[0], rows[0]] })
      .expect(409)
      .expect(({ body }: { body: { code: string; detail: string } }) =>
        expect(body).toMatchObject({
          code: 'schedule_rows_overlap',
          detail: 'Row 2 repeats row 1',
        }),
      );
  });

  it('edits one Session and maps overlaps to a conflict', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/administrator/sessions/${id}`)
      .set('authorization', bearer)
      .send({
        trainerStaffMemberId: other,
        startsAt: '2026-09-26T19:00:00.000Z',
      })
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          id,
          isException: true,
          state: 'scheduled',
        }),
      );
    expect(schedules.updateSession).toHaveBeenCalledWith(
      {
        sessionId: id,
        trainerStaffMemberId: other,
        startsAt: new Date('2026-09-26T19:00:00.000Z'),
      },
      expect.anything(),
    );
    schedules.updateSession.mockRejectedValueOnce(
      new AdministrationError('session_overlap'),
    );
    await request(app.getHttpServer())
      .patch(`/api/v1/administrator/sessions/${id}`)
      .set('authorization', bearer)
      .send({ capacity: 6 })
      .expect(409)
      .expect(({ body }: { body: { code: string } }) =>
        expect(body.code).toBe('session_overlap'),
      );
    await request(app.getHttpServer())
      .post('/api/v1/administrator/sessions')
      .set('authorization', bearer)
      .send({
        branchId: id,
        classTypeId: other,
        trainerStaffMemberId: other,
        startsAt: '2026-09-26T19:00:00.000Z',
        durationMinutes: 50,
      })
      .expect(201);
  });

  it('serves the income report, Referral list, and the Administrator Evaluation cancel', async () => {
    await request(app.getHttpServer())
      .get(
        `/api/v1/administrator/reports/income?from=2026-09-01T04:00:00.000Z&until=2026-10-01T04:00:00.000Z`,
      )
      .set('authorization', bearer)
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          totalCentavos: 78_000,
          byMethod: { cash: 78_000 },
        }),
      );
    await request(app.getHttpServer())
      .get('/api/v1/administrator/referrals?query=sofia&page=1&pageSize=20')
      .set('authorization', bearer)
      .expect(200);
    expect(oversight.listReferrals).toHaveBeenCalledWith(
      { query: 'sofia', page: 1, pageSize: 20 },
      expect.anything(),
    );
    await request(app.getHttpServer())
      .delete(`/api/v1/administrator/evaluations/${id}`)
      .set('authorization', bearer)
      .expect(204);
    expect(cancelEvaluation).toHaveBeenCalledWith(id, expect.anything());
  });

  it('answers 403 when a non-Administrator reaches an operation', async () => {
    catalog.createBranch.mockRejectedValueOnce(
      new AdministrationError('administration_access_denied'),
    );
    await request(app.getHttpServer())
      .post('/api/v1/administrator/branches')
      .set('authorization', bearer)
      .send({ name: 'Centro', address: 'Calle 1' })
      .expect(403)
      .expect(({ body }: { body: { code: string } }) =>
        expect(body.code).toBe('administration_access_denied'),
      );
  });
});
