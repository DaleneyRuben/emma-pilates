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
// The Coordinator's detail carries no Credit amount (ADR-0102).
const detail = {
  id: clientId,
  name: 'Lucía Fernández Paz',
  email: 'lucia@example.com',
  phone: null,
  accountStatus: 'active',
  clientSince: new Date('2025-07-02T00:00:00.000Z'),
  referralCode: 'LUCIA25',
  referredClientCount: 2,
  subscription: {
    status: 'none',
    nextSubscription: null,
    freeze: null,
    canRequestFreeze: false,
    subscription: null,
  },
  closure: {
    futureBookingCount: 0,
    activeWaitlistEntryCount: 0,
    upcomingEvaluationCount: 0,
    transferPaymentPending: false,
  },
};

type Operation = jest.Mock<(...args: unknown[]) => Promise<unknown>>;
const operation = (): Operation =>
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

// IDN-009: AW22 «Editar perfil» corrects a Client's name and phone.
describe('administrator Client profile corrections (e2e)', () => {
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
    read: operation(),
    updateProfile: operation(),
  };

  beforeEach(async () => {
    resolvePrincipal.mockResolvedValue({
      accountId: 'coordinator-account',
      authenticationSessionId: 'session',
      identity: {
        kind: 'staff',
        staffMemberId: 'coordinator',
        role: 'coordinator',
        branchIds: [],
      },
    });
    operations.updateProfile.mockResolvedValue(detail);

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

  it('saves the name and phone and answers the refreshed detail without caching', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/administrator/clients/${clientId}`)
      .set('authorization', bearer)
      .send({ name: 'Lucía Fernández Paz', phone: null })
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect(({ body }) =>
        expect(body).toEqual({
          ...detail,
          clientSince: '2025-07-02',
        }),
      );
    expect(operations.updateProfile).toHaveBeenCalledWith(
      { clientId, name: 'Lucía Fernández Paz', phone: null },
      expect.objectContaining({ accountId: 'coordinator-account' }),
    );
  });

  it.each([
    ['an unknown field', { name: 'Lucía', phone: null, email: 'x@y.z' }],
    ['a missing name', { phone: '+591 70011001' }],
    ['a name over 100 characters', { name: 'a'.repeat(101), phone: null }],
  ])('refuses %s as invalid_request', async (_case, body) => {
    await request(app.getHttpServer())
      .patch(`/api/v1/administrator/clients/${clientId}`)
      .set('authorization', bearer)
      .send(body)
      .expect(400)
      .expect(({ body: problem }: { body: { code?: string } }) =>
        expect(problem.code).toBe('invalid_request'),
      );
    expect(operations.updateProfile).not.toHaveBeenCalled();
  });

  it('answers the use case refusals as problems', async () => {
    operations.updateProfile.mockRejectedValueOnce(
      new AdministrationError('client_name_required'),
    );
    await request(app.getHttpServer())
      .patch(`/api/v1/administrator/clients/${clientId}`)
      .set('authorization', bearer)
      .send({ name: '   ', phone: null })
      .expect(400)
      .expect(({ body }: { body: { code?: string } }) =>
        expect(body.code).toBe('client_name_required'),
      );

    operations.updateProfile.mockRejectedValueOnce(
      new AdministrationError('administration_access_denied'),
    );
    await request(app.getHttpServer())
      .patch(`/api/v1/administrator/clients/${clientId}`)
      .set('authorization', bearer)
      .send({ name: 'Lucía', phone: null })
      .expect(403);
  });
});
