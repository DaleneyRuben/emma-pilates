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

const bearer = `Bearer ${'a'.repeat(43)}`;
const id = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const civil = (date: string) => new Date(`${date}T00:00:00.000Z`);
const schedule = {
  id,
  branchId: id,
  classTypeId: other,
  trainerStaffMemberId: other,
  weekday: 3,
  startsAtLocal: new Date('1970-01-01T07:00:00.000Z'),
  capacity: 12,
  effectiveFrom: civil('2026-11-04'),
  effectiveUntil: null,
  pausedFrom: civil('2026-12-23'),
  pausedUntil: civil('2027-01-06'),
  durationMinutes: 50,
  classType: { name: 'Reformer Pilates' },
};
const scheduleDto = {
  id,
  branchId: id,
  classTypeId: other,
  trainerStaffMemberId: other,
  weekday: 3,
  startsAtLocal: '07:00',
  capacity: 12,
  effectiveFrom: '2026-11-04',
  effectiveUntil: null,
  pausedFrom: '2026-12-23',
  pausedUntil: '2027-01-06',
  classTypeName: 'Reformer Pilates',
  durationMinutes: 50,
};

type Operation = jest.Mock<(...args: unknown[]) => Promise<unknown>>;
const operation = (): Operation =>
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

// BKM-018: pausing and resuming a weekly series over HTTP.
describe('weekly series pause endpoints (e2e)', () => {
  let app: INestApplication<App>;
  const resolvePrincipal = jest.fn<() => Promise<unknown>>();
  const schedules = {
    pauseSchedule: operation(),
    resumeSchedule: operation(),
  };
  const path = `/api/v1/administrator/session-schedules/${id}`;

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
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: administrationControllers,
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        { provide: administrationOperations, useValue: { schedules } },
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

  it('pauses a series from a date until an optional return date', async () => {
    schedules.pauseSchedule.mockResolvedValue({
      schedule,
      cancelledSessions: 2,
      keptSessions: 1,
    });

    await request(app.getHttpServer())
      .post(`${path}/pause`)
      .set('authorization', bearer)
      .send({ pausedFrom: '2026-12-23', pausedUntil: '2027-01-06' })
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect(({ body }) =>
        expect(body).toEqual({
          schedule: scheduleDto,
          cancelledSessions: 2,
          keptSessions: 1,
        }),
      );
    expect(schedules.pauseSchedule).toHaveBeenCalledWith(
      {
        sessionScheduleId: id,
        pausedFrom: civil('2026-12-23'),
        pausedUntil: civil('2027-01-06'),
      },
      expect.anything(),
    );

    await request(app.getHttpServer())
      .post(`${path}/pause`)
      .set('authorization', bearer)
      .send({ pausedFrom: '2026-12-23' })
      .expect(200);
    expect(schedules.pauseSchedule).toHaveBeenLastCalledWith(
      {
        sessionScheduleId: id,
        pausedFrom: civil('2026-12-23'),
        pausedUntil: null,
      },
      expect.anything(),
    );
  });

  it('refuses a malformed pause and answers its conflicts by code', async () => {
    await request(app.getHttpServer())
      .post(`${path}/pause`)
      .set('authorization', bearer)
      .send({ pausedFrom: 'mañana' })
      .expect(400);
    schedules.pauseSchedule.mockRejectedValue(
      new AdministrationError('session_schedule_paused'),
    );
    await request(app.getHttpServer())
      .post(`${path}/pause`)
      .set('authorization', bearer)
      .send({ pausedFrom: '2026-12-23' })
      .expect(409)
      .expect(({ body }: { body: { code: string } }) =>
        expect(body.code).toBe('session_schedule_paused'),
      );
  });

  it('resumes a series and counts the classes it brings back', async () => {
    schedules.resumeSchedule.mockResolvedValue({
      schedule: { ...schedule, pausedFrom: null, pausedUntil: null },
      restoredSessions: 2,
      created: 1,
    });

    await request(app.getHttpServer())
      .post(`${path}/resume`)
      .set('authorization', bearer)
      .expect(200)
      .expect(({ body }) =>
        expect(body).toEqual({
          schedule: { ...scheduleDto, pausedFrom: null, pausedUntil: null },
          restoredSessions: 2,
          created: 1,
        }),
      );
    schedules.resumeSchedule.mockRejectedValue(
      new AdministrationError('session_schedule_not_paused'),
    );
    await request(app.getHttpServer())
      .post(`${path}/resume`)
      .set('authorization', bearer)
      .expect(409)
      .expect(({ body }: { body: { code: string } }) =>
        expect(body.code).toBe('session_schedule_not_paused'),
      );
  });
});
