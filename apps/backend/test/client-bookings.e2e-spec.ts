import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  ClientBookingsController,
  clientBookings,
  leaveWaitlistCommand,
  WaitlistEntriesController,
} from '../src/booking/client/client-bookings.controller';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';

describe('client bookings (e2e)', () => {
  let app: INestApplication<App>;
  const bearer = `Bearer ${'a'.repeat(43)}`;
  const entryId = '11111111-1111-4111-8111-111111111111';
  const leave = jest.fn<() => Promise<void>>();

  beforeEach(async () => {
    leave.mockResolvedValue(undefined);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ClientBookingsController, WaitlistEntriesController],
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
        {
          provide: clientBookings,
          useValue: () =>
            Promise.resolve([
              {
                kind: 'booking',
                bookingId: entryId,
                sessionId: entryId,
                classTypeName: 'Reformer Pilates',
                trainerName: 'Emma Vargas',
                branchName: 'Centro',
                startsAt: new Date('2026-09-21T15:00:00.000Z'),
                endsAt: new Date('2026-09-21T15:50:00.000Z'),
              },
            ]),
        },
        { provide: leaveWaitlistCommand, useValue: leave },
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

  it('serves the upcoming Bookings', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/bookings')
      .set('authorization', bearer)
      .expect(200)
      .expect([
        {
          kind: 'booking',
          bookingId: entryId,
          sessionId: entryId,
          classTypeName: 'Reformer Pilates',
          trainerName: 'Emma Vargas',
          branchName: 'Centro',
          startsAt: '2026-09-21T15:00:00.000Z',
          endsAt: '2026-09-21T15:50:00.000Z',
        },
      ]);
  });

  it('leaves a Waitlist Entry', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/waitlist-entries/${entryId}`)
      .set('authorization', bearer)
      .expect(204);
    expect(leave).toHaveBeenCalledWith(
      { waitlistEntryId: entryId },
      expect.objectContaining({ accountId: 'account-id' }),
    );
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/bookings')
      .expect('Content-Type', /application\/problem\+json/)
      .expect(401);
    await request(app.getHttpServer())
      .delete(`/api/v1/waitlist-entries/${entryId}`)
      .expect(401);
  });
});
