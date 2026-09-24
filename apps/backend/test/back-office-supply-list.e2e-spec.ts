import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { backOfficeOperations } from '../src/back-office/back-office-http';
import { AdministratorSuppliesController } from '../src/back-office/supplies/supplies.controller';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';

const bearer = `Bearer ${'a'.repeat(43)}`;
const branchId = '22222222-2222-4222-8222-222222222222';
const supply = {
  id: '11111111-1111-4111-8111-111111111111',
  branchId,
  name: 'Papel higiénico',
  quantityOnHand: 3,
  lowStockThreshold: 4,
  lowStock: true,
  archivedAt: null,
};

// WEB-007: AW08's table, AW31's Supply filter, and the sidebar's low-stock
// count read one paged, allowlisted list (ADR-0061/0062), never cached.
describe('administrator supply list endpoint (e2e)', () => {
  let app: INestApplication<App>;
  const listSupplies = jest.fn<(...args: unknown[]) => Promise<unknown>>();

  beforeEach(async () => {
    listSupplies.mockResolvedValue({
      items: [supply],
      page: 2,
      pageSize: 1,
      totalItems: 3,
      lowStockCount: 2,
    });
    const moduleFixture = await Test.createTestingModule({
      controllers: [AdministratorSuppliesController],
      providers: [
        {
          provide: authenticatedPrincipalResolver,
          useValue: () =>
            Promise.resolve({
              accountId: 'admin-account',
              authenticationSessionId: 'session',
              identity: {
                kind: 'staff',
                staffMemberId: 'admin',
                role: 'administrator',
                branchIds: [],
              },
            }),
        },
        {
          provide: backOfficeOperations,
          useValue: { supplies: { listSupplies } },
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

  const list = (query: string) =>
    request(app.getHttpServer())
      .get(`/api/v1/administrator/supplies?${query}`)
      .set('authorization', bearer);

  it('pages a Branch’s Supplies with the low-stock count and no caching', async () => {
    await list(`branchId=${branchId}&status=all&page=2&pageSize=1`)
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect(({ body }) =>
        expect(body).toEqual({
          items: [supply],
          page: 2,
          pageSize: 1,
          totalItems: 3,
          lowStockCount: 2,
        }),
      );
    expect(listSupplies).toHaveBeenCalledWith(
      { branchId, status: 'all', page: 2, pageSize: 1 },
      expect.anything(),
    );
  });

  it('defaults to the first page of 20 active Supplies', async () => {
    await list(`branchId=${branchId}`).expect(200);
    expect(listSupplies).toHaveBeenCalledWith(
      { branchId, status: 'active', page: 1, pageSize: 20 },
      expect.anything(),
    );
  });

  it.each([
    ['no Branch', 'status=active'],
    ['an unknown status', `branchId=${branchId}&status=deleted`],
    ['a page over 100 rows', `branchId=${branchId}&pageSize=101`],
    ['an unknown filter', `branchId=${branchId}&lowStock=true`],
  ])('refuses %s as invalid_request', async (_case, query) => {
    await list(query)
      .expect(400)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'invalid_request' }),
      );
    expect(listSupplies).not.toHaveBeenCalled();
  });
});
