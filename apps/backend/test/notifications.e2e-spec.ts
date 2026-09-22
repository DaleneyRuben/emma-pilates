import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { NotificationNotFoundError } from '../src/notifications/mark-notification-read';
import {
  NotificationsController,
  notificationList,
  notificationMarkAllRead,
  notificationMarkRead,
  notificationUnreadCount,
} from '../src/notifications/notifications.controller';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';

describe('notifications (e2e)', () => {
  let app: INestApplication<App>;
  const bearer = `Bearer ${'a'.repeat(43)}`;
  const notificationId = '11111111-1111-4111-8111-111111111111';
  const markRead = jest.fn<() => Promise<void>>();

  beforeEach(async () => {
    markRead.mockResolvedValue(undefined);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
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
          provide: notificationList,
          useValue: () =>
            Promise.resolve({
              items: [
                {
                  id: notificationId,
                  category: 'booking_schedule',
                  type: 'waitlist_promoted',
                  title: 'Cupo liberado',
                  message: '¡Tienes un cupo!',
                  destinationType: 'booking',
                  destinationId: notificationId,
                  createdAt: new Date('2026-09-21T12:00:00.000Z'),
                  readAt: null,
                },
              ],
              hasMore: false,
              nextCursor: null,
            }),
        },
        {
          provide: notificationUnreadCount,
          useValue: () => Promise.resolve(1),
        },
        { provide: notificationMarkRead, useValue: markRead },
        {
          provide: notificationMarkAllRead,
          useValue: () => Promise.resolve({ marked: 1 }),
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

  it('serves the inbox page and unread count', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/notifications?limit=10')
      .set('authorization', bearer)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          hasMore: false,
          nextCursor: null,
          items: [
            {
              id: notificationId,
              type: 'waitlist_promoted',
              createdAt: '2026-09-21T12:00:00.000Z',
              readAt: null,
            },
          ],
        });
      });
    await request(app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set('authorization', bearer)
      .expect(200)
      .expect({ unread: 1 });
  });

  it('marks notifications read', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/notifications/${notificationId}/read`)
      .set('authorization', bearer)
      .expect(204);
    await request(app.getHttpServer())
      .post('/api/v1/notifications/read-all')
      .set('authorization', bearer)
      .expect(200)
      .expect({ marked: 1 });

    markRead.mockRejectedValue(new NotificationNotFoundError());
    await request(app.getHttpServer())
      .post(`/api/v1/notifications/${notificationId}/read`)
      .set('authorization', bearer)
      .expect('Content-Type', /application\/problem\+json/)
      .expect(404)
      .expect(({ body }) => {
        expect(body).toMatchObject({ code: 'notification_not_found' });
      });
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer()).get('/api/v1/notifications').expect(401);
  });
});
