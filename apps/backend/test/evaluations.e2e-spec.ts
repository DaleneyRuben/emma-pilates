import { INestApplication } from '@nestjs/common';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { BookingAccessDeniedError } from '../src/booking/commands/create-booking';
import { EvaluationRuleError } from '../src/booking/evaluations/evaluation-errors';
import { InvalidEvaluationCursorError } from '../src/booking/evaluations/prisma-evaluation-commands';
import {
  bearer,
  branchId,
  civil,
  evaluationCommandDoubles,
  evaluationId,
  key,
  primeEvaluationCommands,
  principal,
  principalResolverDouble,
  slot,
  slotId,
  startEvaluationsApp,
} from './evaluations-test-support';

describe('evaluations (e2e)', () => {
  let app: INestApplication<App>;
  const resolvePrincipal = principalResolverDouble();
  const commands = evaluationCommandDoubles();

  beforeEach(async () => {
    primeEvaluationCommands(commands, resolvePrincipal);
    app = await startEvaluationsApp(commands, resolvePrincipal);
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
});
