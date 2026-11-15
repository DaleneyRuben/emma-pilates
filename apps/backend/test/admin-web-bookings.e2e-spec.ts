import {
  INestApplication,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import type { App } from 'supertest/types';
import { BookingController } from '../src/booking/booking.controller';
import {
  classesLeftThisWeekQuery,
  createBookingCommand,
  joinWaitlistCommand,
  sessionAvailability,
} from '../src/booking/booking-controller-support';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { createAdminWebRequestMiddleware } from '../src/system-identity/admin-web/admin-web-request.middleware';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';
import {
  administrator,
  credential,
  sessionCookie,
  trustedOrigin,
} from './admin-web-test-app';

// FIX-058 (walkthrough finding 77): Horario › «Reservar» books a Client on
// her behalf from the admin web, which authenticates with its cookie.
type Command = (
  command: { sessionId: string; clientId?: string },
  principal: AuthenticatedPrincipal,
  idempotencyKey: string,
) => Promise<{ id: string }>;
type Resolve = (
  credential: string,
  meaningfulActivity: boolean,
  surface?: 'mobile' | 'admin_web',
) => Promise<AuthenticatedPrincipal>;

const resolvePrincipal = jest.fn<Resolve>();
const createBooking = jest.fn<Command>();
const joinWaitlist = jest.fn<Command>();

@Module({
  controllers: [BookingController],
  providers: [
    { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
    { provide: createBookingCommand, useValue: createBooking },
    { provide: joinWaitlistCommand, useValue: joinWaitlist },
    { provide: sessionAvailability, useValue: jest.fn() },
    { provide: classesLeftThisWeekQuery, useValue: jest.fn() },
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
  ],
})
class AdminWebBookingTestModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(createAdminWebRequestMiddleware([trustedOrigin]))
      .forRoutes('{*splat}');
  }
}

const sessionId = '11111111-1111-4111-8111-111111111111';
const clientId = '22222222-2222-4222-8222-222222222222';
const idempotencyKey = '33333333-3333-4333-8333-333333333333';

describe('admin web booking on a Client behalf (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    resolvePrincipal.mockResolvedValue(administrator);
    createBooking.mockResolvedValue({ id: 'booking-id' });
    joinWaitlist.mockResolvedValue({ id: 'waitlist-entry-id' });
    const moduleFixture = await Test.createTestingModule({
      imports: [AdminWebBookingTestModule],
    }).compile();
    app = moduleFixture.createNestApplication<INestApplication<App>>();
    configureApplication(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it.each([
    ['bookings', createBooking, 'booking-id'],
    ['waitlist-entries', joinWaitlist, 'waitlist-entry-id'],
  ] as const)(
    'serves POST %s from the admin web session cookie',
    async (resource, command, id) => {
      await request(app.getHttpServer())
        .post(`/api/v1/sessions/${sessionId}/${resource}`)
        .set('Origin', trustedOrigin)
        .set('Cookie', sessionCookie)
        .set('Idempotency-Key', idempotencyKey)
        .send({ clientId })
        .expect(201)
        .expect(({ body }) => expect(body).toEqual({ id }));

      expect(resolvePrincipal).toHaveBeenCalledWith(
        credential,
        true,
        'admin_web',
      );
      expect(command).toHaveBeenCalledWith(
        { sessionId, clientId },
        administrator,
        idempotencyKey,
      );
    },
  );

  it('refuses a cookie booking from another origin before any work', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/sessions/${sessionId}/bookings`)
      .set('Origin', 'https://attacker.example')
      .set('Cookie', sessionCookie)
      .set('Idempotency-Key', idempotencyKey)
      .send({ clientId })
      .expect(403)
      .expect(({ body }) =>
        expect(body).toEqual(
          expect.objectContaining({ code: 'untrusted_origin' }),
        ),
      );
    expect(resolvePrincipal).not.toHaveBeenCalled();
    expect(createBooking).not.toHaveBeenCalled();
  });

  it('keeps the mobile apps on their bearer credential', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/sessions/${sessionId}/bookings`)
      .set('Authorization', `Bearer ${credential}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({})
      .expect(201);
    expect(resolvePrincipal).toHaveBeenCalledWith(credential, true, 'mobile');
  });

  it('answers 401 without a credential', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/sessions/${sessionId}/bookings`)
      .set('Idempotency-Key', idempotencyKey)
      .send({ clientId })
      .expect(401);
    expect(createBooking).not.toHaveBeenCalled();
  });
});
