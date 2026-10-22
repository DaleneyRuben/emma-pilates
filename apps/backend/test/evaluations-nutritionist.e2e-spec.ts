import { INestApplication } from '@nestjs/common';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  bearer,
  block,
  blockId,
  branchId,
  civil,
  evaluationCommandDoubles,
  evaluationId,
  key,
  primeEvaluationCommands,
  principal,
  principalResolverDouble,
  slotId,
  startEvaluationsApp,
} from './evaluations-test-support';

describe('nutritionist evaluations (e2e)', () => {
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
