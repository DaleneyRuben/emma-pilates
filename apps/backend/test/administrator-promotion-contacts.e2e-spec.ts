import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { AdministrationError } from '../src/booking/administration/administration-errors';
import {
  AdministratorPromotionContactsController,
  promotionContactOperations,
} from '../src/booking/promotion-contacts/promotion-contacts.controller';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';

const bearer = `Bearer ${'a'.repeat(43)}`;
const contactId = '11111111-1111-4111-8111-111111111111';
const valeria = {
  id: contactId,
  kind: 'former_client' as const,
  name: 'Valeria Quiroga',
  email: 'valeria@example.com',
  phone: '+591 70011005',
  consentedAt: new Date('2026-10-19T20:00:00.000Z'),
};
const serialized = { ...valeria, consentedAt: '2026-10-19T20:00:00.000Z' };

type Operation = jest.Mock<(...args: unknown[]) => Promise<unknown>>;
const operation = (): Operation =>
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

describe('administrator Promotion Contact endpoints (e2e)', () => {
  let app: INestApplication<App>;
  const resolvePrincipal =
    jest.fn<
      (
        credential: string,
        meaningfulActivity: boolean,
      ) => Promise<AuthenticatedPrincipal>
    >();
  const operations = {
    list: operation(),
    export: operation(),
    withdraw: operation(),
  };
  const principal: AuthenticatedPrincipal = {
    accountId: 'admin-account',
    authenticationSessionId: 'session',
    identity: {
      kind: 'staff',
      staffMemberId: 'admin',
      role: 'administrator',
      branchIds: [],
    },
  };

  beforeEach(async () => {
    resolvePrincipal.mockResolvedValue(principal);
    operations.list.mockResolvedValue({
      items: [valeria],
      page: 1,
      pageSize: 20,
      totalItems: 1,
    });
    operations.export.mockResolvedValue([valeria]);
    operations.withdraw.mockResolvedValue(undefined);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AdministratorPromotionContactsController],
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        { provide: promotionContactOperations, useValue: operations },
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

  it('pages the contacts with the search and never caches them', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/administrator/promotion-contacts?page=2&pageSize=10&q=vale')
      .set('authorization', bearer)
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect(({ body }) =>
        expect(body).toEqual({
          items: [serialized],
          page: 1,
          pageSize: 20,
          totalItems: 1,
        }),
      );
    expect(operations.list).toHaveBeenCalledWith(
      { page: 2, pageSize: 10, query: 'vale' },
      principal,
    );
  });

  it('refuses unknown filters', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/administrator/promotion-contacts?consented=yes')
      .set('authorization', bearer)
      .expect(400)
      .expect(({ body }: { body: { code: string } }) =>
        expect(body.code).toBe('invalid_request'),
      );
    expect(operations.list).not.toHaveBeenCalled();
  });

  it('exports every contact without caching', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/administrator/promotion-contacts/export')
      .set('authorization', bearer)
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect(({ body }) => expect(body).toEqual({ items: [serialized] }));
    expect(operations.export).toHaveBeenCalledWith(principal);
  });

  it('records a withdrawal with no content', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/administrator/promotion-contacts/${contactId}/withdrawal`)
      .set('authorization', bearer)
      .expect(204);
    expect(operations.withdraw).toHaveBeenCalledWith({ contactId }, principal);
  });

  it('answers 404 for a contact already withdrawn', async () => {
    operations.withdraw.mockRejectedValue(
      new AdministrationError('promotion_contact_not_found'),
    );
    await request(app.getHttpServer())
      .post(`/api/v1/administrator/promotion-contacts/${contactId}/withdrawal`)
      .set('authorization', bearer)
      .expect(404)
      .expect(({ body }: { body: { code: string } }) =>
        expect(body.code).toBe('promotion_contact_not_found'),
      );
  });

  it('refuses a malformed contact identifier', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/administrator/promotion-contacts/not-a-uuid/withdrawal')
      .set('authorization', bearer)
      .expect(400);
    expect(operations.withdraw).not.toHaveBeenCalled();
  });

  it('answers 403 for a Staff Member who is not an Administrator', async () => {
    operations.export.mockRejectedValue(
      new AdministrationError('administration_access_denied'),
    );
    await request(app.getHttpServer())
      .get('/api/v1/administrator/promotion-contacts/export')
      .set('authorization', bearer)
      .expect(403);
  });
});
