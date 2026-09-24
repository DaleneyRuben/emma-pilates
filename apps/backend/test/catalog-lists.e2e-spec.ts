import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { AdministrationError } from '../src/booking/administration/administration-errors';
import {
  catalogListControllers,
  catalogListOperations,
} from '../src/booking/administration/catalog-lists.controller';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';

const bearer = `Bearer ${'a'.repeat(43)}`;
const id = '11111111-1111-4111-8111-111111111111';
const branch = { id, name: 'Centro', address: 'Calle 1', archivedAt: null };
const page = <Item>(items: Item[]) => ({
  items,
  page: 1,
  pageSize: 20,
  totalItems: items.length,
});

type Operation = jest.Mock<(...args: unknown[]) => Promise<unknown>>;
const operation = (): Operation =>
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

describe('catalog list endpoints (e2e)', () => {
  let app: INestApplication<App>;
  const resolvePrincipal =
    jest.fn<
      (
        credential: string,
        meaningfulActivity: boolean,
      ) => Promise<AuthenticatedPrincipal>
    >();
  const lists = {
    listBranches: operation(),
    listClassTypes: operation(),
    listPlans: operation(),
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
    lists.listBranches.mockResolvedValue(page([branch]));
    lists.listClassTypes.mockResolvedValue(page([]));
    lists.listPlans.mockResolvedValue(page([]));

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: catalogListControllers,
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        { provide: catalogListOperations, useValue: lists },
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

  it('pages Branches with active ones by default', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/administrator/branches')
      .set('authorization', bearer)
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect(({ body }) => expect(body).toEqual(page([branch])));
    expect(lists.listBranches).toHaveBeenCalledWith(
      { status: 'active', page: 1, pageSize: 20 },
      expect.anything(),
    );

    await request(app.getHttpServer())
      .get('/api/v1/administrator/branches?status=archived&page=2&pageSize=5')
      .set('authorization', bearer)
      .expect(200);
    expect(lists.listBranches).toHaveBeenLastCalledWith(
      { status: 'archived', page: 2, pageSize: 5 },
      expect.anything(),
    );
  });

  it('pages Class Types and Plans with their own filters', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/administrator/class-types?status=all')
      .set('authorization', bearer)
      .expect(200);
    expect(lists.listClassTypes).toHaveBeenCalledWith(
      { status: 'all', page: 1, pageSize: 20 },
      expect.anything(),
    );

    await request(app.getHttpServer())
      .get('/api/v1/administrator/plans?visibility=hidden')
      .set('authorization', bearer)
      .expect(200);
    expect(lists.listPlans).toHaveBeenCalledWith(
      { visibility: 'hidden', page: 1, pageSize: 20 },
      expect.anything(),
    );
    await request(app.getHttpServer())
      .get('/api/v1/administrator/plans')
      .set('authorization', bearer)
      .expect(200);
    expect(lists.listPlans).toHaveBeenLastCalledWith(
      { visibility: 'all', page: 1, pageSize: 20 },
      expect.anything(),
    );
  });

  it('rejects unknown filters, unsupported values, and oversized pages', async () => {
    for (const path of [
      '/api/v1/administrator/branches?sort=name',
      '/api/v1/administrator/branches?status=deleted',
      '/api/v1/administrator/class-types?pageSize=500',
      '/api/v1/administrator/plans?status=active',
    ]) {
      await request(app.getHttpServer())
        .get(path)
        .set('authorization', bearer)
        .expect(400)
        .expect(({ body }: { body: { code?: string } }) =>
          expect(body.code).toBe('invalid_request'),
        );
    }
    expect(lists.listBranches).not.toHaveBeenCalled();
  });

  it('answers 403 when a non-Administrator reads a catalog table', async () => {
    lists.listPlans.mockRejectedValueOnce(
      new AdministrationError('administration_access_denied'),
    );
    await request(app.getHttpServer())
      .get('/api/v1/administrator/plans')
      .set('authorization', bearer)
      .expect(403)
      .expect(({ body }: { body: { code?: string } }) =>
        expect(body.code).toBe('administration_access_denied'),
      );
  });
});
