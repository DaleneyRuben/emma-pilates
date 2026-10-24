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
import {
  FeedbackError,
  type FeedbackRow,
} from '../src/system-identity/feedback/feedback';
import {
  feedbackControllers,
  feedbackOperations,
} from '../src/system-identity/feedback/feedback.controller';

const bearer = `Bearer ${'a'.repeat(43)}`;
const idempotencyKey = '22222222-2222-4222-8222-222222222222';
const feedbackId = '11111111-1111-4111-8111-111111111111';
const createdAt = new Date('2026-10-23T15:00:00.000Z');

const message = {
  type: 'problem',
  text: 'No puedo ver mis reservas de mañana.',
  appVersion: '1.0.1',
  appBuild: '3',
  platform: 'android',
  osVersion: '14',
};

const row: FeedbackRow = {
  ...message,
  type: 'problem',
  platform: 'android',
  id: feedbackId,
  app: 'client',
  role: 'client',
  status: 'resolved',
  changeNote: 'Arreglamos la lista de reservas en la 1.0.2.',
  senderEmail: 'valeria@example.com',
  createdAt,
  triagedAt: new Date('2026-10-23T16:00:00.000Z'),
};
const serialized = {
  ...row,
  createdAt: '2026-10-23T15:00:00.000Z',
  triagedAt: '2026-10-23T16:00:00.000Z',
};

type Operation = jest.Mock<(...args: unknown[]) => Promise<unknown>>;
const operation = (): Operation =>
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

describe('Feedback endpoints (e2e, REL-012)', () => {
  let app: INestApplication<App>;
  const resolvePrincipal =
    jest.fn<
      (
        credential: string,
        meaningfulActivity: boolean,
      ) => Promise<AuthenticatedPrincipal>
    >();
  const operations = {
    send: operation(),
    list: operation(),
    export: operation(),
    triage: operation(),
  };
  const principal: AuthenticatedPrincipal = {
    accountId: 'client-account',
    authenticationSessionId: 'session',
    identity: { kind: 'client', clientId: 'client-id' },
  };

  beforeEach(async () => {
    resolvePrincipal.mockResolvedValue(principal);
    operations.send.mockResolvedValue({ id: feedbackId, createdAt });
    operations.list.mockResolvedValue({
      items: [row],
      page: 1,
      pageSize: 20,
      totalItems: 1,
      newCount: 3,
    });
    operations.export.mockResolvedValue([row]);
    operations.triage.mockResolvedValue(row);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [...feedbackControllers],
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        { provide: feedbackOperations, useValue: operations },
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

  describe('POST /api/v1/feedback', () => {
    it('sends the Feedback under the Idempotency-Key and never caches the answer', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/feedback')
        .set('authorization', bearer)
        .set('idempotency-key', idempotencyKey)
        .send(message)
        .expect(201)
        .expect('Cache-Control', 'no-store')
        .expect(({ body }) =>
          expect(body).toEqual({
            id: feedbackId,
            createdAt: '2026-10-23T15:00:00.000Z',
          }),
        );
      expect(operations.send).toHaveBeenCalledWith(
        { ...message, idempotencyKey },
        principal,
      );
    });

    it('requires an Idempotency-Key', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/feedback')
        .set('authorization', bearer)
        .send(message)
        .expect(400);
      expect(operations.send).not.toHaveBeenCalled();
    });

    it.each([
      ['an unknown type', { ...message, type: 'complaint' }],
      ['a text under 10 characters', { ...message, text: 'Muy mal' }],
      ['a text over 2,000 characters', { ...message, text: 'a'.repeat(2001) }],
      ['an unknown platform', { ...message, platform: 'web' }],
      ['a missing version', { ...message, appVersion: undefined }],
      [
        'a version over 40 characters',
        { ...message, osVersion: `v${'1'.repeat(40)}` },
      ],
      [
        'an extra field such as the Role',
        { ...message, role: 'administrator' },
      ],
    ])('refuses %s', async (_label, body) => {
      await request(app.getHttpServer())
        .post('/api/v1/feedback')
        .set('authorization', bearer)
        .set('idempotency-key', idempotencyKey)
        .send(body)
        .expect(400)
        .expect(({ body: problem }: { body: { code: string } }) =>
          expect(problem.code).toBe('invalid_request'),
        );
      expect(operations.send).not.toHaveBeenCalled();
    });

    it('answers 429 with its own code past the daily limit', async () => {
      operations.send.mockRejectedValue(
        new FeedbackError('feedback_limit_reached'),
      );
      await request(app.getHttpServer())
        .post('/api/v1/feedback')
        .set('authorization', bearer)
        .set('idempotency-key', idempotencyKey)
        .send(message)
        .expect(429)
        .expect(({ body }: { body: { code: string } }) =>
          expect(body.code).toBe('feedback_limit_reached'),
        );
    });

    it('answers 401 without a credential', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/feedback')
        .set('idempotency-key', idempotencyKey)
        .send(message)
        .expect(401);
    });
  });

  describe('administrator Feedback', () => {
    it('pages the Feedback with the filters', async () => {
      await request(app.getHttpServer())
        .get(
          '/api/v1/administrator/feedback?page=2&pageSize=10&status=new&app=staff',
        )
        .set('authorization', bearer)
        .expect(200)
        .expect('Cache-Control', 'no-store')
        .expect(({ body }) =>
          expect(body).toEqual({
            items: [serialized],
            page: 1,
            pageSize: 20,
            totalItems: 1,
            newCount: 3,
          }),
        );
      expect(operations.list).toHaveBeenCalledWith(
        { page: 2, pageSize: 10, status: 'new', app: 'staff' },
        principal,
      );
    });

    it('lists every status and app when no filter is given', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/administrator/feedback')
        .set('authorization', bearer)
        .expect(200);
      expect(operations.list).toHaveBeenCalledWith(
        { page: 1, pageSize: 20 },
        principal,
      );
    });

    it('refuses unknown filters', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/administrator/feedback?status=closed')
        .set('authorization', bearer)
        .expect(400);
      await request(app.getHttpServer())
        .get('/api/v1/administrator/feedback?platform=ios')
        .set('authorization', bearer)
        .expect(400);
      expect(operations.list).not.toHaveBeenCalled();
    });

    it('exports every Feedback without caching', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/administrator/feedback/export')
        .set('authorization', bearer)
        .expect(200)
        .expect('Cache-Control', 'no-store')
        .expect(({ body }) => expect(body).toEqual({ items: [serialized] }));
      expect(operations.export).toHaveBeenCalledWith(principal);
    });

    it('triages a Feedback with its note', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/administrator/feedback/${feedbackId}/triage`)
        .set('authorization', bearer)
        .send({ status: 'resolved', changeNote: row.changeNote })
        .expect(200)
        .expect(({ body }) => expect(body).toEqual(serialized));
      expect(operations.triage).toHaveBeenCalledWith(
        { feedbackId, status: 'resolved', changeNote: row.changeNote },
        principal,
      );
    });

    it('refuses a malformed triage', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/administrator/feedback/not-a-uuid/triage')
        .set('authorization', bearer)
        .send({ status: 'resolved', changeNote: null })
        .expect(400);
      await request(app.getHttpServer())
        .post(`/api/v1/administrator/feedback/${feedbackId}/triage`)
        .set('authorization', bearer)
        .send({ status: 'closed', changeNote: null })
        .expect(400);
      expect(operations.triage).not.toHaveBeenCalled();
    });

    it.each([
      ['feedback_access_denied', 403],
      ['feedback_not_found', 404],
    ] as const)('answers %s with %i', async (code, status) => {
      operations.triage.mockRejectedValue(new FeedbackError(code));
      await request(app.getHttpServer())
        .post(`/api/v1/administrator/feedback/${feedbackId}/triage`)
        .set('authorization', bearer)
        .send({ status: 'reviewed', changeNote: null })
        .expect(status)
        .expect(({ body }: { body: { code: string } }) =>
          expect(body.code).toBe(code),
        );
    });
  });
});
