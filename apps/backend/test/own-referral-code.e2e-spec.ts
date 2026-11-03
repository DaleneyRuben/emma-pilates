import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { AcquisitionError } from '../src/booking/acquisition/acquisition-errors';
import {
  OwnReferralCodeController,
  ownReferralCodeOperations,
} from '../src/booking/acquisition/own-referral-code.controller';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';

const bearer = `Bearer ${'a'.repeat(43)}`;
const editableFrom = new Date('2026-12-03T15:00:00.000Z');

type Operation = jest.Mock<(...args: unknown[]) => Promise<unknown>>;
const operation = (): Operation =>
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

// BKM-017: a Client («Invita a una amiga») or a Trainer (Staff «Perfil»)
// reads, checks, and changes her own Referral Code.
describe('own referral code endpoints (e2e)', () => {
  let app: INestApplication<App>;
  const client: AuthenticatedPrincipal = {
    accountId: 'lucia-account',
    authenticationSessionId: 'session',
    identity: { kind: 'client', clientId: 'lucia-id' },
  };
  const resolvePrincipal =
    jest.fn<
      (
        credential: string,
        meaningfulActivity: boolean,
      ) => Promise<AuthenticatedPrincipal>
    >();
  const operations = {
    read: operation(),
    change: operation(),
    checkAvailability: operation(),
  };

  beforeEach(async () => {
    resolvePrincipal.mockResolvedValue(client);
    operations.read.mockResolvedValue({
      referralCode: 'LUCIA',
      editableFrom: null,
    });
    operations.change.mockResolvedValue({
      referralCode: 'LU-PILATES',
      editableFrom,
    });
    operations.checkAvailability.mockResolvedValue({
      code: 'LUNA',
      status: 'available',
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [OwnReferralCodeController],
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        { provide: ownReferralCodeOperations, useValue: operations },
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

  it('reads her code and when she may change it, never cached', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/referral-codes/current')
      .set('authorization', bearer)
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect(({ body }) =>
        expect(body).toEqual({ referralCode: 'LUCIA', editableFrom: null }),
      );
    expect(operations.read).toHaveBeenCalledWith(client);
  });

  it('changes her code', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/referral-codes/current')
      .set('authorization', bearer)
      .send({ referralCode: 'lu-pilates' })
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect(({ body }) =>
        expect(body).toEqual({
          referralCode: 'LU-PILATES',
          editableFrom: editableFrom.toISOString(),
        }),
      );
    expect(operations.change).toHaveBeenCalledWith(
      { referralCode: 'lu-pilates' },
      client,
    );
  });

  it.each([
    ['a missing code', {}],
    ['a null code', { referralCode: null }],
    ['an extra field', { referralCode: 'LUNA', extra: 1 }],
  ])('refuses %s as invalid_request', async (_case, body) => {
    await request(app.getHttpServer())
      .put('/api/v1/referral-codes/current')
      .set('authorization', bearer)
      .send(body)
      .expect(400)
      .expect(({ body: problem }: { body: { code: string } }) =>
        expect(problem.code).toBe('invalid_request'),
      );
    expect(operations.change).not.toHaveBeenCalled();
  });

  it.each([
    ['referral_code_in_use', 409],
    ['referral_code_blocked', 409],
    ['referral_code_change_too_soon', 409],
    ['referral_code_malformed', 400],
    ['acquisition_access_denied', 403],
  ] as const)('answers %s with %i', async (code, status) => {
    operations.change.mockRejectedValue(new AcquisitionError(code));

    await request(app.getHttpServer())
      .put('/api/v1/referral-codes/current')
      .set('authorization', bearer)
      .send({ referralCode: 'SOFIA' })
      .expect(status)
      .expect(({ body }: { body: { code: string } }) =>
        expect(body.code).toBe(code),
      );
  });

  it('checks a typed code for live feedback', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/referral-codes/availability')
      .query({ code: 'luna' })
      .set('authorization', bearer)
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect(({ body }) =>
        expect(body).toEqual({ code: 'LUNA', status: 'available' }),
      );
    expect(operations.checkAvailability).toHaveBeenCalledWith(
      { code: 'luna' },
      client,
    );

    await request(app.getHttpServer())
      .get('/api/v1/referral-codes/availability')
      .set('authorization', bearer)
      .expect(400);
  });
});
