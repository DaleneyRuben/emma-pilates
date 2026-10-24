import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { AcquisitionError } from '../src/booking/acquisition/acquisition-errors';
import {
  acquisitionOperations,
  AdministratorClientAcquisitionController,
  AdministratorTrainerReferralCodeController,
} from '../src/booking/acquisition/acquisition.controller';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';

const bearer = `Bearer ${'a'.repeat(43)}`;
const clientId = '11111111-1111-4111-8111-111111111111';
const staffMemberId = '22222222-2222-4222-8222-222222222222';
const view = {
  clientId,
  declaredChannel: 'instagram',
  channel: 'trainer',
  referralCode: 'CARLA',
  referrer: { kind: 'trainer', id: staffMemberId, name: 'Carla' },
};

type Operation = jest.Mock<(...args: unknown[]) => Promise<unknown>>;
const operation = (): Operation =>
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

// BKM-011: «¿Cómo nos conociste?» on AW22 and a Trainer's code on AW24.
describe('acquisition administration endpoints (e2e)', () => {
  let app: INestApplication<App>;
  const resolvePrincipal =
    jest.fn<
      (
        credential: string,
        meaningfulActivity: boolean,
      ) => Promise<AuthenticatedPrincipal>
    >();
  const operations = {
    readClient: operation(),
    correctClient: operation(),
    readTrainerCode: operation(),
    setTrainerCode: operation(),
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
    operations.readClient.mockResolvedValue(view);
    operations.correctClient.mockResolvedValue(view);
    operations.readTrainerCode.mockResolvedValue({
      staffMemberId,
      referralCode: null,
    });
    operations.setTrainerCode.mockResolvedValue({
      staffMemberId,
      referralCode: 'CARLA',
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        AdministratorClientAcquisitionController,
        AdministratorTrainerReferralCodeController,
      ],
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        { provide: acquisitionOperations, useValue: operations },
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

  it('reads and corrects how a Client found the studio, never cached', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/administrator/clients/${clientId}/acquisition`)
      .set('authorization', bearer)
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect(({ body }) => expect(body).toEqual(view));

    await request(app.getHttpServer())
      .put(`/api/v1/administrator/clients/${clientId}/acquisition`)
      .set('authorization', bearer)
      .send({ channel: 'tiktok', referralCode: 'carla' })
      .expect(200)
      .expect(({ body }) => expect(body).toEqual(view));
    expect(operations.correctClient).toHaveBeenCalledWith(
      { clientId, channel: 'tiktok', referralCode: 'carla' },
      expect.objectContaining({ accountId: 'admin-account' }),
    );
  });

  it.each([
    ['an unknown channel', { channel: 'radio', referralCode: null }],
    ['the unknown channel', { channel: 'unknown', referralCode: null }],
    ['a missing channel', { referralCode: null }],
    ['an extra field', { channel: 'other', referralCode: null, extra: 1 }],
  ])('refuses %s as invalid_request', async (_case, body) => {
    await request(app.getHttpServer())
      .put(`/api/v1/administrator/clients/${clientId}/acquisition`)
      .set('authorization', bearer)
      .send(body)
      .expect(400)
      .expect(({ body: problem }: { body: { code: string } }) =>
        expect(problem.code).toBe('invalid_request'),
      );
    expect(operations.correctClient).not.toHaveBeenCalled();
  });

  it.each([
    ['acquisition_access_denied', 403],
    ['referral_code_invalid', 400],
    ['client_not_found', 404],
  ] as const)('answers %s with %d', async (code, status) => {
    operations.correctClient.mockRejectedValue(new AcquisitionError(code));

    await request(app.getHttpServer())
      .put(`/api/v1/administrator/clients/${clientId}/acquisition`)
      .set('authorization', bearer)
      .send({ channel: 'other', referralCode: 'NADIE' })
      .expect(status)
      .expect(({ body }: { body: { code: string } }) =>
        expect(body.code).toBe(code),
      );
  });

  it('reads and sets a Trainer’s personal code', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/administrator/staff-members/${staffMemberId}/referral-code`)
      .set('authorization', bearer)
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect(({ body }) =>
        expect(body).toEqual({ staffMemberId, referralCode: null }),
      );

    await request(app.getHttpServer())
      .put(`/api/v1/administrator/staff-members/${staffMemberId}/referral-code`)
      .set('authorization', bearer)
      .send({ referralCode: 'carla' })
      .expect(200)
      .expect(({ body }) =>
        expect(body).toEqual({ staffMemberId, referralCode: 'CARLA' }),
      );
    expect(operations.setTrainerCode).toHaveBeenCalledWith(
      { staffMemberId, referralCode: 'carla' },
      expect.anything(),
    );
  });

  it.each([
    ['referral_code_in_use', 409],
    ['staff_member_not_trainer', 409],
    ['referral_code_malformed', 400],
  ] as const)('answers a refused code with %s', async (code, status) => {
    operations.setTrainerCode.mockRejectedValue(new AcquisitionError(code));

    await request(app.getHttpServer())
      .put(`/api/v1/administrator/staff-members/${staffMemberId}/referral-code`)
      .set('authorization', bearer)
      .send({ referralCode: 'LUZ' })
      .expect(status)
      .expect(({ body }: { body: { code: string } }) =>
        expect(body.code).toBe(code),
      );
  });

  it('refuses an identifier that is not a UUID', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/administrator/clients/nope/acquisition')
      .set('authorization', bearer)
      .expect(400);
    await request(app.getHttpServer())
      .put('/api/v1/administrator/staff-members/nope/referral-code')
      .set('authorization', bearer)
      .send({ referralCode: null })
      .expect(400);
  });
});
