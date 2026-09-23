import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { BookingAccessDeniedError } from '../src/booking/commands/create-booking';
import { EvaluationRuleError } from '../src/booking/evaluations/evaluation-errors';
import {
  ClientEvaluationsController,
  evaluationCommands,
  EvaluationSlotsController,
} from '../src/booking/evaluations/evaluations.controller';
import {
  NutritionistAvailabilityBlocksController,
  NutritionistEvaluationsController,
} from '../src/booking/evaluations/nutritionist.controller';
import { InvalidEvaluationCursorError } from '../src/booking/evaluations/prisma-evaluation-commands';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';

const bearer = `Bearer ${'a'.repeat(43)}`;
const key = '11111111-1111-4111-8111-111111111111';
const slotId = '22222222-2222-4222-8222-222222222222';
const evaluationId = '33333333-3333-4333-8333-333333333333';
const blockId = '44444444-4444-4444-8444-444444444444';
const branchId = '55555555-5555-4555-8555-555555555555';
const civil = (date: string) => new Date(`${date}T00:00:00.000Z`);

const slot = {
  id: slotId,
  startsAt: new Date('2026-09-28T13:45:00.000Z'),
  endsAt: new Date('2026-09-28T14:30:00.000Z'),
  durationMinutes: 45,
  branchId,
  branchName: 'Centro',
  nutritionistName: 'Gabriela Flores',
  bookable: true,
};
const evaluation = {
  id: evaluationId,
  slotId,
  state: 'booked',
  startsAt: slot.startsAt,
  endsAt: slot.endsAt,
  durationMinutes: 45,
  branchId,
  branchName: 'Centro',
  nutritionistName: 'Gabriela Flores',
  cancellableUntil: new Date('2026-09-28T10:45:00.000Z'),
  cancellable: true,
};
const block = {
  id: blockId,
  branchId,
  branchName: 'Centro',
  weekday: 1,
  startsAtLocal: '09:00',
  endsAtLocal: '13:00',
  effectiveFrom: civil('2026-09-21'),
  effectiveUntil: null,
  slotsPerWeek: 5,
  upcomingBookedCount: 1,
};

describe('evaluations (e2e)', () => {
  let app: INestApplication<App>;
  const resolvePrincipal =
    jest.fn<
      (
        credential: string,
        meaningfulActivity: boolean,
      ) => Promise<AuthenticatedPrincipal>
    >();
  const commands = {
    listBookableSlots: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    readEvaluationSlot: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    bookEvaluation: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    listClientEvaluations: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    cancelClientEvaluation: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    listNutritionistAgenda: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    cancelEvaluationAsStaff:
      jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    listAvailabilityBlocks: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    createAvailabilityBlock:
      jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    replaceAvailabilityBlock:
      jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    endAvailabilityBlock: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };
  const principal: AuthenticatedPrincipal = {
    accountId: 'account-id',
    authenticationSessionId: 'authentication-session-id',
    identity: { kind: 'client', clientId: 'client-id' },
  };

  beforeEach(async () => {
    resolvePrincipal.mockResolvedValue(principal);
    commands.listBookableSlots.mockResolvedValue({
      days: [{ date: civil('2026-09-28'), slots: [slot] }],
      months: [
        {
          month: civil('2026-09-01'),
          status: 'used',
          evaluation: { id: evaluationId, startsAt: slot.startsAt },
        },
        { month: civil('2026-10-01'), status: 'available', evaluation: null },
      ],
    });
    commands.readEvaluationSlot.mockResolvedValue(slot);
    commands.bookEvaluation.mockResolvedValue(evaluation);
    commands.listClientEvaluations.mockResolvedValue({
      items: [evaluation],
      hasMore: false,
      nextCursor: null,
    });
    commands.cancelClientEvaluation.mockResolvedValue(undefined);
    commands.listNutritionistAgenda.mockResolvedValue({
      items: [
        {
          evaluationId,
          clientName: 'Lucía Fernández',
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          durationMinutes: 45,
          branchId,
          branchName: 'Centro',
          kind: 'first',
        },
      ],
      hasMore: true,
      nextCursor: 'next-page',
    });
    commands.cancelEvaluationAsStaff.mockResolvedValue(undefined);
    commands.listAvailabilityBlocks.mockResolvedValue([block]);
    commands.createAvailabilityBlock.mockResolvedValue(block);
    commands.replaceAvailabilityBlock.mockResolvedValue({
      ended: { ...block, effectiveUntil: civil('2026-10-05') },
      replacement: {
        ...block,
        id: '66666666-6666-4666-8666-666666666666',
        startsAtLocal: '10:00',
        effectiveFrom: civil('2026-10-05'),
        slotsPerWeek: 4,
        upcomingBookedCount: 0,
      },
      withdrawnSlots: 14,
      keptEvaluations: 1,
    });
    commands.endAvailabilityBlock.mockResolvedValue({
      block: { ...block, effectiveUntil: civil('2026-10-12') },
      withdrawnSlots: 8,
      keptEvaluations: 2,
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        EvaluationSlotsController,
        ClientEvaluationsController,
        NutritionistEvaluationsController,
        NutritionistAvailabilityBlocksController,
      ],
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        { provide: evaluationCommands, useValue: commands },
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

  it('lists bookable slots by Bolivia date with the monthly summary as a private revalidated read', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/evaluation-slots')
      .query({ from: '2026-09-22', to: '2026-10-10', branchId })
      .set('authorization', bearer)
      .expect(200)
      .expect('Cache-Control', 'private, no-cache')
      .expect(({ body }) => {
        expect(body).toEqual({
          days: [
            {
              date: '2026-09-28',
              slots: [
                {
                  ...slot,
                  startsAt: '2026-09-28T13:45:00.000Z',
                  endsAt: '2026-09-28T14:30:00.000Z',
                },
              ],
            },
          ],
          months: [
            {
              month: '2026-09-01',
              status: 'used',
              evaluation: {
                id: evaluationId,
                startsAt: '2026-09-28T13:45:00.000Z',
              },
            },
            { month: '2026-10-01', status: 'available', evaluation: null },
          ],
        });
      });
    expect(commands.listBookableSlots).toHaveBeenCalledWith(
      { from: civil('2026-09-22'), to: civil('2026-10-10'), branchId },
      principal,
    );

    await request(app.getHttpServer())
      .get('/api/v1/evaluation-slots')
      .query({ from: 'tomorrow' })
      .set('authorization', bearer)
      .expect(400)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'invalid_request' }),
      );
  });

  it('reads one slot and books it with a required Idempotency-Key', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/evaluation-slots/${slotId}`)
      .set('authorization', bearer)
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({ id: slotId, bookable: true }),
      );
    await request(app.getHttpServer())
      .get('/api/v1/evaluation-slots/not-a-uuid')
      .set('authorization', bearer)
      .expect(400);

    await request(app.getHttpServer())
      .post(`/api/v1/evaluation-slots/${slotId}/evaluations`)
      .set('authorization', bearer)
      .set('idempotency-key', key)
      .expect(201)
      .expect('Cache-Control', 'no-store')
      .expect(({ body }) =>
        expect(body).toMatchObject({
          id: evaluationId,
          state: 'booked',
          cancellableUntil: '2026-09-28T10:45:00.000Z',
        }),
      );
    expect(commands.bookEvaluation).toHaveBeenCalledWith(
      slotId,
      principal,
      key,
    );

    await request(app.getHttpServer())
      .post(`/api/v1/evaluation-slots/${slotId}/evaluations`)
      .set('authorization', bearer)
      .expect(400)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'invalid_request' }),
      );
  });

  it('reports evaluation rule violations as RFC 9457 problems with stable codes', async () => {
    commands.bookEvaluation.mockRejectedValueOnce(
      new EvaluationRuleError('evaluation_month_used', 'used'),
    );
    await request(app.getHttpServer())
      .post(`/api/v1/evaluation-slots/${slotId}/evaluations`)
      .set('authorization', bearer)
      .set('idempotency-key', key)
      .expect('Content-Type', /application\/problem\+json/)
      .expect(409)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          code: 'evaluation_month_used',
          status: 409,
        }),
      );

    commands.readEvaluationSlot.mockRejectedValueOnce(
      new EvaluationRuleError('evaluation_slot_not_found', 'missing'),
    );
    await request(app.getHttpServer())
      .get(`/api/v1/evaluation-slots/${slotId}`)
      .set('authorization', bearer)
      .expect(404)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'evaluation_slot_not_found' }),
      );

    commands.listAvailabilityBlocks.mockRejectedValueOnce(
      new BookingAccessDeniedError(),
    );
    await request(app.getHttpServer())
      .get('/api/v1/nutritionist/availability-blocks')
      .set('authorization', bearer)
      .expect(403)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'booking_access_denied' }),
      );
  });

  it('pages the Client’s upcoming and past Evaluations and cancels one', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/evaluations')
      .query({ scope: 'past', cursor: 'abc', limit: '5' })
      .set('authorization', bearer)
      .expect(200)
      .expect('Cache-Control', 'private, no-cache')
      .expect(({ body }) =>
        expect(body).toMatchObject({
          items: [{ id: evaluationId }],
          hasMore: false,
          nextCursor: null,
        }),
      );
    expect(commands.listClientEvaluations).toHaveBeenCalledWith(
      { scope: 'past', cursor: 'abc', limit: 5 },
      principal,
    );
    await request(app.getHttpServer())
      .get('/api/v1/evaluations')
      .query({ scope: 'all' })
      .set('authorization', bearer)
      .expect(400);
    commands.listClientEvaluations.mockRejectedValueOnce(
      new InvalidEvaluationCursorError('bad cursor'),
    );
    await request(app.getHttpServer())
      .get('/api/v1/evaluations')
      .query({ scope: 'past', cursor: 'zzz' })
      .set('authorization', bearer)
      .expect(400)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'invalid_request' }),
      );

    await request(app.getHttpServer())
      .delete(`/api/v1/evaluations/${evaluationId}`)
      .set('authorization', bearer)
      .expect(204)
      .expect('Cache-Control', 'no-store');
    expect(commands.cancelClientEvaluation).toHaveBeenCalledWith(
      evaluationId,
      principal,
    );
    commands.cancelClientEvaluation.mockRejectedValueOnce(
      new EvaluationRuleError('evaluation_cancellation_window_closed', 'late'),
    );
    await request(app.getHttpServer())
      .delete(`/api/v1/evaluations/${evaluationId}`)
      .set('authorization', bearer)
      .expect(409)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          code: 'evaluation_cancellation_window_closed',
        }),
      );
  });

  it('serves the Nutritionist agenda and staff cancellation', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/nutritionist/evaluations')
      .query({ from: '2026-09-28', limit: '10' })
      .set('authorization', bearer)
      .expect(200)
      .expect('Cache-Control', 'private, no-cache')
      .expect(({ body }) =>
        expect(body).toMatchObject({
          items: [
            { evaluationId, clientName: 'Lucía Fernández', kind: 'first' },
          ],
          hasMore: true,
          nextCursor: 'next-page',
        }),
      );
    expect(commands.listNutritionistAgenda).toHaveBeenCalledWith(
      { from: civil('2026-09-28'), limit: 10 },
      principal,
    );

    await request(app.getHttpServer())
      .delete(`/api/v1/nutritionist/evaluations/${evaluationId}`)
      .set('authorization', bearer)
      .expect(204)
      .expect('Cache-Control', 'no-store');
    expect(commands.cancelEvaluationAsStaff).toHaveBeenCalledWith(
      evaluationId,
      principal,
    );
  });

  it('lists, creates, replaces, and ends the Nutritionist’s Availability Blocks', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/nutritionist/availability-blocks')
      .set('authorization', bearer)
      .expect(200)
      .expect(({ body }) =>
        expect(body).toEqual([
          { ...block, effectiveFrom: '2026-09-21', effectiveUntil: null },
        ]),
      );

    const values = {
      branchId,
      weekday: 1,
      startsAtLocal: '09:00',
      endsAtLocal: '13:00',
      effectiveFrom: '2026-09-21',
    };
    await request(app.getHttpServer())
      .post('/api/v1/nutritionist/availability-blocks')
      .set('authorization', bearer)
      .set('idempotency-key', key)
      .send(values)
      .expect(201)
      .expect('Cache-Control', 'no-store')
      .expect(({ body }) =>
        expect(body).toMatchObject({
          id: blockId,
          effectiveFrom: '2026-09-21',
        }),
      );
    expect(commands.createAvailabilityBlock).toHaveBeenCalledWith(
      { ...values, effectiveFrom: civil('2026-09-21') },
      principal,
      key,
    );
    for (const invalid of [
      { ...values, weekday: 8 },
      { ...values, startsAtLocal: '9:00' },
      { ...values, effectiveFrom: '21/09/2026' },
      { ...values, extra: true },
    ]) {
      await request(app.getHttpServer())
        .post('/api/v1/nutritionist/availability-blocks')
        .set('authorization', bearer)
        .set('idempotency-key', key)
        .send(invalid)
        .expect(400);
    }

    await request(app.getHttpServer())
      .post(`/api/v1/nutritionist/availability-blocks/${blockId}/replacement`)
      .set('authorization', bearer)
      .set('idempotency-key', key)
      .send({ ...values, startsAtLocal: '10:00', effectiveFrom: '2026-10-05' })
      .expect(201)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          ended: { id: blockId, effectiveUntil: '2026-10-05' },
          replacement: { startsAtLocal: '10:00', effectiveFrom: '2026-10-05' },
          withdrawnSlots: 14,
          keptEvaluations: 1,
        }),
      );
    expect(commands.replaceAvailabilityBlock).toHaveBeenCalledWith(
      {
        ...values,
        blockId,
        startsAtLocal: '10:00',
        effectiveFrom: civil('2026-10-05'),
      },
      principal,
      key,
    );

    await request(app.getHttpServer())
      .post(`/api/v1/nutritionist/availability-blocks/${blockId}/end`)
      .set('authorization', bearer)
      .send({ effectiveFrom: '2026-10-12' })
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect(({ body }) =>
        expect(body).toMatchObject({
          block: { effectiveUntil: '2026-10-12' },
          withdrawnSlots: 8,
          keptEvaluations: 2,
        }),
      );
    expect(commands.endAvailabilityBlock).toHaveBeenCalledWith(
      { blockId, effectiveFrom: civil('2026-10-12') },
      principal,
    );
  });

  it('requires authentication on every evaluation route', async () => {
    for (const path of [
      '/api/v1/evaluation-slots',
      `/api/v1/evaluation-slots/${slotId}`,
      '/api/v1/evaluations?scope=upcoming',
      '/api/v1/nutritionist/evaluations',
      '/api/v1/nutritionist/availability-blocks',
    ]) {
      await request(app.getHttpServer())
        .get(path)
        .expect('Content-Type', /application\/problem\+json/)
        .expect(401);
    }
  });
});
