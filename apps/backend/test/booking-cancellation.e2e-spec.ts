import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { BookingCancellationController } from '../src/booking/booking.controller';
import { cancelBookingCommand } from '../src/booking/booking-controller-support';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';

describe('booking cancellation (e2e)', () => {
  let app: INestApplication<App>;
  const bearer = `Bearer ${'a'.repeat(43)}`;
  const bookingId = '11111111-1111-4111-8111-111111111111';
  const cancel = jest.fn<() => Promise<void>>();

  beforeEach(async () => {
    cancel.mockResolvedValue(undefined);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [BookingCancellationController],
      providers: [
        {
          provide: authenticatedPrincipalResolver,
          useValue: (): Promise<AuthenticatedPrincipal> =>
            Promise.resolve({
              accountId: 'account-id',
              authenticationSessionId: 'authentication-session-id',
              identity: { kind: 'client', clientId: 'client-id' },
            }),
        },
        { provide: cancelBookingCommand, useValue: cancel },
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

  it('answers 204 when a Booking is cancelled', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/bookings/${bookingId}`)
      .set('authorization', bearer)
      .expect(204);
    expect(cancel).toHaveBeenCalledWith(
      { bookingId },
      expect.objectContaining({ accountId: 'account-id' }),
    );
  });
});
