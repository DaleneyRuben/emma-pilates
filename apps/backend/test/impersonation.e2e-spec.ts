import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';
import {
  ImpersonationError,
  type ImpersonationErrorCode,
  type ImpersonationView,
} from '../src/system-identity/impersonation/impersonation';
import {
  ImpersonationController,
  impersonationOperations,
  type ImpersonationOperations,
} from '../src/system-identity/impersonation/impersonation.controller';
import {
  DevicesController,
  deviceDeactivation,
  deviceRegistration,
} from '../src/notifications/devices/devices.controller';
import {
  NotificationsController,
  notificationList,
  notificationMarkAllRead,
  notificationMarkRead,
  notificationUnreadCount,
} from '../src/notifications/notifications.controller';

describe('impersonation (e2e)', () => {
  let app: INestApplication<App>;
  const bearer = `Bearer ${'a'.repeat(43)}`;
  const staffMemberId = '11111111-1111-4111-8111-111111111111';
  const administrator: AuthenticatedPrincipal = {
    accountId: 'administrator-account-id',
    authenticationSessionId: 'authentication-session-id',
    identity: {
      kind: 'staff',
      staffMemberId: 'administrator-staff-member-id',
      role: 'administrator',
      branchIds: [],
    },
  };
  const view: ImpersonationView = {
    id: 'impersonation-id',
    staffMemberId,
    staffMemberName: 'Camila Rojas',
    role: 'trainer',
    expiresAt: new Date('2026-10-22T15:30:00.000Z'),
  };
  const resolvePrincipal =
    jest.fn<
      (
        credential: string,
        meaningfulActivity: boolean,
        surface?: 'mobile' | 'admin_web',
      ) => Promise<AuthenticatedPrincipal>
    >();
  const start = jest.fn<ImpersonationOperations['start']>();
  const end = jest.fn<ImpersonationOperations['end']>();

  beforeEach(async () => {
    resolvePrincipal.mockResolvedValue(administrator);
    start.mockResolvedValue(view);
    end.mockResolvedValue(undefined);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ImpersonationController],
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        { provide: impersonationOperations, useValue: { start, end } },
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

  it('starts an Impersonation on the mobile session and never caches it', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/impersonations')
      .set('Authorization', bearer)
      .send({ staffMemberId })
      .expect(201)
      .expect('Cache-Control', 'no-store')
      .expect({
        id: 'impersonation-id',
        staffMemberId,
        staffMemberName: 'Camila Rojas',
        role: 'trainer',
        expiresAt: '2026-10-22T15:30:00.000Z',
      });

    expect(start).toHaveBeenCalledWith(
      { staffMemberId, surface: 'mobile' },
      administrator,
    );
  });

  it('refuses a malformed body before authenticating', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/impersonations')
      .set('Authorization', bearer)
      .send({ staffMemberId: 'not-a-uuid' })
      .expect(400)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'invalid_request' }),
      );
    expect(resolvePrincipal).not.toHaveBeenCalled();
  });

  it.each<[ImpersonationErrorCode, number]>([
    ['staff_access_denied', 403],
    ['impersonation_surface', 403],
    ['impersonation_active', 409],
    ['staff_member_not_found', 404],
    ['staff_member_not_impersonable', 409],
  ])('answers %s as a %i problem', async (code, status) => {
    start.mockRejectedValue(new ImpersonationError(code));

    await request(app.getHttpServer())
      .post('/api/v1/impersonations')
      .set('Authorization', bearer)
      .send({ staffMemberId })
      .expect('Content-Type', /application\/problem\+json/)
      .expect(status)
      .expect(({ body }) => expect(body).toMatchObject({ code }));
  });

  it('ends the current Impersonation', async () => {
    const impersonating: AuthenticatedPrincipal = {
      ...administrator,
      accountId: 'trainer-account-id',
      impersonation: {
        id: 'impersonation-id',
        administratorAccountId: 'administrator-account-id',
        staffMemberName: 'Camila Rojas',
        expiresAt: view.expiresAt,
      },
    };
    resolvePrincipal.mockResolvedValue(impersonating);

    await request(app.getHttpServer())
      .delete('/api/v1/impersonations/current')
      .set('Authorization', bearer)
      .expect(204);

    expect(end).toHaveBeenCalledWith(impersonating);
  });

  it('answers impersonation_not_active as 404 when nothing is active', async () => {
    end.mockRejectedValue(new ImpersonationError('impersonation_not_active'));

    await request(app.getHttpServer())
      .delete('/api/v1/impersonations/current')
      .set('Authorization', bearer)
      .expect(404)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'impersonation_not_active' }),
      );
  });

  it('requires a bearer credential', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/impersonations')
      .send({ staffMemberId })
      .expect(401);
  });
});

describe('commands refused while impersonating (e2e, FUT-001)', () => {
  let app: INestApplication<App>;
  const bearer = `Bearer ${'a'.repeat(43)}`;
  const impersonating: AuthenticatedPrincipal = {
      accountId: 'trainer-account-id',
      authenticationSessionId: 'authentication-session-id',
      identity: {
        kind: 'staff',
        staffMemberId: 'trainer-staff-member-id',
        role: 'trainer',
        branchIds: [],
      },
      impersonation: {
        id: 'impersonation-id',
        administratorAccountId: 'administrator-account-id',
        staffMemberName: 'Camila Rojas',
        expiresAt: new Date('2026-10-22T15:30:00.000Z'),
      },
    };
  const register = jest.fn<() => Promise<void>>();
  const deactivate = jest.fn<() => Promise<void>>();
  const markRead = jest.fn<() => Promise<void>>();
  const markAllRead = jest.fn<() => Promise<{ marked: number }>>();
  const listPage = jest.fn<() => Promise<unknown>>();
  const countUnread = jest.fn<() => Promise<number>>();

  beforeEach(async () => {
    listPage.mockResolvedValue({ items: [], hasMore: false, nextCursor: null });
    countUnread.mockResolvedValue(2);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [DevicesController, NotificationsController],
      providers: [
        {
          provide: authenticatedPrincipalResolver,
          useValue: () => Promise.resolve(impersonating),
        },
        { provide: deviceRegistration, useValue: register },
        { provide: deviceDeactivation, useValue: deactivate },
        { provide: notificationList, useValue: listPage },
        { provide: notificationUnreadCount, useValue: countUnread },
        { provide: notificationMarkRead, useValue: markRead },
        { provide: notificationMarkAllRead, useValue: markAllRead },
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

  it.each([
    [
      'registering a push device',
      () =>
        request(app.getHttpServer())
          .put('/api/v1/notifications/devices/current')
          .send({
            installationId: '3f0d4c1e-7c1b-4a8e-9a55-5d7c3b2a1f00',
            expoPushToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
            platform: 'ios',
          }),
    ],
    [
      'deactivating the push device',
      () =>
        request(app.getHttpServer())
          .post('/api/v1/notifications/devices/current/deactivate')
          .send({ installationId: '3f0d4c1e-7c1b-4a8e-9a55-5d7c3b2a1f00' }),
    ],
    [
      'marking every notification read',
      () => request(app.getHttpServer()).post('/api/v1/notifications/read-all'),
    ],
    [
      'marking one notification read',
      () =>
        request(app.getHttpServer()).post(
          '/api/v1/notifications/11111111-1111-4111-8111-111111111111/read',
        ),
    ],
  ])('refuses %s with impersonation_forbidden', async (_label, send) => {
    await send()
      .set('Authorization', bearer)
      .expect(403)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'impersonation_forbidden' }),
      );
    expect(register).not.toHaveBeenCalled();
    expect(deactivate).not.toHaveBeenCalled();
    expect(markRead).not.toHaveBeenCalled();
    expect(markAllRead).not.toHaveBeenCalled();
  });

  it('still lets the acting Staff Member read the inbox and the unread count', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', bearer)
      .expect(200)
      .expect({ unread: 2 });
    await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Authorization', bearer)
      .expect(200);
  });
});
