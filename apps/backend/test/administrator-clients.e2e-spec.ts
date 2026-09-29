import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { AdministrationError } from '../src/booking/administration/administration-errors';
import {
  AdministratorClientsController,
  administratorClientOperations,
} from '../src/booking/clients/administrator-clients.controller';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';

const bearer = `Bearer ${'a'.repeat(43)}`;
const clientId = '11111111-1111-4111-8111-111111111111';
const row = {
  id: clientId,
  name: 'Lucía Fernández',
  email: 'lucia@example.com',
  phone: '+591 70011001',
  accountStatus: 'active',
  planName: 'Paquete de 8 clases',
  subscriptionStatus: 'active',
};
const directoryPage = {
  items: [row],
  page: 1,
  pageSize: 20,
  totalItems: 1,
  studioClientCount: 148,
  activePlanClientCount: 96,
};
const detail = {
  id: clientId,
  name: 'Lucía Fernández',
  email: 'lucia@example.com',
  phone: '+591 70011001',
  accountStatus: 'pending',
  clientSince: new Date('2025-07-02T00:00:00.000Z'),
  referralCode: 'LUCIA25',
  referredClientCount: 2,
  subscription: {
    status: 'active',
    subscription: {
      id: '22222222-2222-4222-8222-222222222222',
      planName: 'Paquete de 8 clases',
      originalClassAllowance: 8,
      remainingClassAllowance: 5,
      startsOn: new Date('2026-09-01T00:00:00.000Z'),
      endsOn: new Date('2026-09-30T00:00:00.000Z'),
    },
  },
  creditAvailableCentavos: 105_000,
  closure: {
    futureBookingCount: 3,
    activeWaitlistEntryCount: 1,
    upcomingEvaluationCount: 1,
    transferPaymentPending: false,
  },
};

type Operation = jest.Mock<(...args: unknown[]) => Promise<unknown>>;
const operation = (): Operation =>
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

describe('administrator Client endpoints (e2e)', () => {
  let app: INestApplication<App>;
  const resolvePrincipal =
    jest.fn<
      (
        credential: string,
        meaningfulActivity: boolean,
      ) => Promise<AuthenticatedPrincipal>
    >();
  const operations = { list: operation(), read: operation() };

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
    operations.list.mockResolvedValue(directoryPage);
    operations.read.mockResolvedValue(detail);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AdministratorClientsController],
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        { provide: administratorClientOperations, useValue: operations },
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

  it('pages the Client directory with the studio counts and never caches it', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/administrator/clients')
      .set('authorization', bearer)
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect(({ body }) => expect(body).toEqual(directoryPage));
    expect(operations.list).toHaveBeenCalledWith(
      { page: 1, pageSize: 20 },
      expect.objectContaining({ accountId: 'admin-account' }),
    );

    await request(app.getHttpServer())
      .get('/api/v1/administrator/clients?q=lucía&page=2&pageSize=5')
      .set('authorization', bearer)
      .expect(200);
    expect(operations.list).toHaveBeenLastCalledWith(
      { page: 2, pageSize: 5, query: 'lucía' },
      expect.anything(),
    );
  });

  it.each([
    ['an unknown filter', '?branchId=11111111-1111-4111-8111-111111111111'],
    ['a page size above 100', '?pageSize=101'],
    ['a search longer than 100 characters', `?q=${'a'.repeat(101)}`],
  ])('refuses %s as invalid_request', async (_case, search) => {
    await request(app.getHttpServer())
      .get(`/api/v1/administrator/clients${search}`)
      .set('authorization', bearer)
      .expect(400)
      .expect(({ body }: { body: { code?: string } }) =>
        expect(body.code).toBe('invalid_request'),
      );
    expect(operations.list).not.toHaveBeenCalled();
  });

  it('reads one Client with civil dates for the Plan and the creation day', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/administrator/clients/${clientId}`)
      .set('authorization', bearer)
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect(({ body }) =>
        expect(body).toEqual({
          ...detail,
          clientSince: '2025-07-02',
          subscription: {
            status: 'active',
            subscription: {
              ...detail.subscription.subscription,
              startsOn: '2026-09-01',
              endsOn: '2026-09-30',
            },
          },
        }),
      );
    expect(operations.read).toHaveBeenCalledWith(
      { clientId },
      expect.anything(),
    );
  });

  it('answers the use case refusals as problems', async () => {
    operations.read.mockRejectedValueOnce(
      new AdministrationError('client_not_found'),
    );
    await request(app.getHttpServer())
      .get(`/api/v1/administrator/clients/${clientId}`)
      .set('authorization', bearer)
      .expect(404)
      .expect(({ body }: { body: { code?: string } }) =>
        expect(body.code).toBe('client_not_found'),
      );

    operations.list.mockRejectedValueOnce(
      new AdministrationError('administration_access_denied'),
    );
    await request(app.getHttpServer())
      .get('/api/v1/administrator/clients')
      .set('authorization', bearer)
      .expect(403)
      .expect(({ body }: { body: { code?: string } }) =>
        expect(body.code).toBe('administration_access_denied'),
      );

    await request(app.getHttpServer())
      .get('/api/v1/administrator/clients/not-a-uuid')
      .set('authorization', bearer)
      .expect(400)
      .expect(({ body }: { body: { code?: string } }) =>
        expect(body.code).toBe('invalid_request'),
      );

    await request(app.getHttpServer())
      .get('/api/v1/administrator/clients')
      .expect(401);
  });
});
