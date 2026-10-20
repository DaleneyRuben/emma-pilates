import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { BookingAccessDeniedError } from '../src/booking/commands/create-booking';
import {
  PromotionsConsentController,
  promotionsConsentOperations,
  type PromotionsConsentOperations,
} from '../src/booking/promotions-consent/promotions-consent.controller';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';

const path = '/api/v1/clients/current/promotions-consent';
const consentedAt = new Date('2026-10-01T12:00:00.000Z');

describe('client promotions consent (e2e)', () => {
  let app: INestApplication<App>;
  const bearer = `Bearer ${'a'.repeat(43)}`;
  const client: AuthenticatedPrincipal = {
    accountId: 'account-id',
    authenticationSessionId: 'session-id',
    identity: { kind: 'client', clientId: 'client-id' },
  };
  const resolvePrincipal =
    jest.fn<(credential: string) => Promise<AuthenticatedPrincipal>>();
  const operations = {
    read: jest.fn<PromotionsConsentOperations['read']>(),
    set: jest.fn<PromotionsConsentOperations['set']>(),
  };

  beforeEach(async () => {
    resolvePrincipal.mockResolvedValue(client);
    operations.read.mockReset();
    operations.set.mockReset();
    operations.read.mockResolvedValue({ consented: true, consentedAt });
    operations.set.mockResolvedValue({ consented: false, consentedAt: null });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PromotionsConsentController],
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        { provide: promotionsConsentOperations, useValue: operations },
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('reads the signed-in Client consent without caching', async () => {
    await request(app.getHttpServer())
      .get(path)
      .set('authorization', bearer)
      .expect(200)
      .expect('cache-control', 'no-store')
      .expect({ consented: true, consentedAt: '2026-10-01T12:00:00.000Z' });
    expect(operations.read).toHaveBeenCalledWith(client);
  });

  it('sets the consent and answers with the new state', async () => {
    await request(app.getHttpServer())
      .put(path)
      .set('authorization', bearer)
      .send({ consented: false })
      .expect(200)
      .expect('cache-control', 'no-store')
      .expect({ consented: false, consentedAt: null });
    expect(operations.set).toHaveBeenCalledWith({ consented: false }, client);
  });

  it.each([{}, { consented: 'yes' }, { consented: true, extra: 1 }])(
    'refuses the body %j',
    async (body) => {
      await request(app.getHttpServer())
        .put(path)
        .set('authorization', bearer)
        .send(body)
        .expect(400)
        .expect(({ body: problem }) =>
          expect(problem).toMatchObject({ code: 'invalid_request' }),
        );
      expect(operations.set).not.toHaveBeenCalled();
    },
  );

  it('refuses a Staff Member', async () => {
    operations.read.mockRejectedValue(new BookingAccessDeniedError());
    await request(app.getHttpServer())
      .get(path)
      .set('authorization', bearer)
      .expect(403)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'booking_access_denied' }),
      );
  });

  it('requires a bearer credential', async () => {
    await request(app.getHttpServer()).get(path).expect(401);
    await request(app.getHttpServer())
      .put(path)
      .send({ consented: true })
      .expect(401);
  });
});
