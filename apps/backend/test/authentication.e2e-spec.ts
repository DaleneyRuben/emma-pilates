import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { AuthenticationFailedError } from '../src/system-identity/authentication/authenticate-credentials';
import {
  authenticatedPrincipalResolver,
  AuthenticationController,
  currentSessionLogout,
  mobileLogin,
} from '../src/system-identity/authentication/authentication.controller';
import { LoginThrottledError } from '../src/system-identity/authentication/login';

describe('authentication (e2e)', () => {
  let app: INestApplication<App>;
  const executeLogin = jest.fn();
  const resolvePrincipal = jest.fn();
  const executeLogout = jest.fn();

  beforeEach(async () => {
    executeLogin.mockResolvedValue({ credential: 'opaque-credential' });
    resolvePrincipal.mockResolvedValue({
      accountId: 'account-id',
      authenticationSessionId: 'authentication-session-id',
      identity: { kind: 'client', clientId: 'client-id' },
    });
    executeLogout.mockResolvedValue(undefined);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthenticationController],
      providers: [
        { provide: mobileLogin, useValue: executeLogin },
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        { provide: currentSessionLogout, useValue: executeLogout },
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

  it('creates a mobile Authentication Session', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/authentication-sessions')
      .set('x-client-identifier', 'mobile-installation-id')
      .send({ email: 'ANA@Example.COM', password: 'correct password' })
      .expect(201)
      .expect({ credential: 'opaque-credential' });

    expect(executeLogin).toHaveBeenCalledWith({
      email: 'ANA@Example.COM',
      password: 'correct password',
      clientIdentifier: 'mobile-installation-id',
      networkAddress: '::ffff:127.0.0.1',
    });
  });

  it('returns the same neutral response for every credential failure', async () => {
    executeLogin.mockRejectedValue(new AuthenticationFailedError());

    await request(app.getHttpServer())
      .post('/api/v1/authentication-sessions')
      .send({ email: 'unknown@example.com', password: 'wrong password' })
      .expect('Content-Type', /application\/problem\+json/)
      .expect(401)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            code: 'authentication_failed',
            detail: 'Email or password is incorrect',
          }),
        );
      });
  });

  it('returns a neutral throttle response with Retry-After', async () => {
    executeLogin.mockRejectedValue(new LoginThrottledError(30));

    await request(app.getHttpServer())
      .post('/api/v1/authentication-sessions')
      .send({ email: 'ana@example.com', password: 'wrong password' })
      .expect('Retry-After', '30')
      .expect(429)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            code: 'login_throttled',
            detail: 'Login is temporarily unavailable. Try again later',
          }),
        );
      });
  });

  it('resolves the current Account identity from a bearer credential', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/authentication-sessions/current')
      .set('Authorization', 'Bearer opaque-credential')
      .expect(200)
      .expect({
        accountId: 'account-id',
        identity: { kind: 'client', clientId: 'client-id' },
      });

    expect(resolvePrincipal).toHaveBeenCalledWith('opaque-credential', true);
  });

  it('logs out the current Authentication Session', async () => {
    await request(app.getHttpServer())
      .delete('/api/v1/authentication-sessions/current')
      .set('Authorization', 'Bearer opaque-credential')
      .expect(204);

    expect(resolvePrincipal).toHaveBeenCalledWith('opaque-credential', true);
    expect(executeLogout).toHaveBeenCalledWith('authentication-session-id');
  });
});
