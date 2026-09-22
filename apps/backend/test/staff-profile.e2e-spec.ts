import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  StaffProfileController,
  staffProfile,
} from '../src/booking/staff/staff-profile.controller';
import { BookingAccessDeniedError } from '../src/booking/commands/create-booking';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';

describe('staff profile (e2e)', () => {
  let app: INestApplication<App>;
  const bearer = `Bearer ${'a'.repeat(43)}`;
  const resolvePrincipal =
    jest.fn<
      (
        credential: string,
        meaningfulActivity: boolean,
      ) => Promise<AuthenticatedPrincipal>
    >();
  const loadProfile =
    jest.fn<(principal: AuthenticatedPrincipal) => Promise<unknown>>();

  beforeEach(async () => {
    resolvePrincipal.mockResolvedValue({
      accountId: 'account-id',
      authenticationSessionId: 'authentication-session-id',
      identity: {
        kind: 'staff',
        staffMemberId: 'staff-member-id',
        role: 'trainer',
        branchIds: ['11111111-1111-4111-8111-111111111111'],
      },
    });
    loadProfile.mockImplementation((principal) =>
      principal.identity.kind === 'staff'
        ? Promise.resolve({
            id: 'staff-member-id',
            name: 'Emma Vargas',
            email: 'emma.vargas@example.com',
            phone: null,
            role: 'trainer',
            branches: [
              { id: '11111111-1111-4111-8111-111111111111', name: 'Centro' },
              { id: '22222222-2222-4222-8222-222222222222', name: 'Urubó' },
            ],
          })
        : Promise.reject(new BookingAccessDeniedError()),
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [StaffProfileController],
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        { provide: staffProfile, useValue: loadProfile },
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

  it('serves the current Staff Member profile', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/staff-members/current')
      .set('authorization', bearer)
      .expect(200)
      .expect({
        id: 'staff-member-id',
        name: 'Emma Vargas',
        email: 'emma.vargas@example.com',
        phone: null,
        role: 'trainer',
        branches: [
          { id: '11111111-1111-4111-8111-111111111111', name: 'Centro' },
          { id: '22222222-2222-4222-8222-222222222222', name: 'Urubó' },
        ],
      });
  });

  it('denies Client principals', async () => {
    resolvePrincipal.mockResolvedValue({
      accountId: 'account-id',
      authenticationSessionId: 'authentication-session-id',
      identity: { kind: 'client', clientId: 'client-id' },
    });

    await request(app.getHttpServer())
      .get('/api/v1/staff-members/current')
      .set('authorization', bearer)
      .expect('Content-Type', /application\/problem\+json/)
      .expect(403)
      .expect(({ body }) => {
        expect(body).toMatchObject({ code: 'booking_access_denied' });
      });
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/staff-members/current')
      .expect('Content-Type', /application\/problem\+json/)
      .expect(401);
  });
});
