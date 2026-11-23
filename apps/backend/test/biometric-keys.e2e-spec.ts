import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import { LoginThrottledError } from '../src/system-identity/authentication/login';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';
import {
  BiometricKeyRejectedError,
  MissingInstallationError,
} from '../src/system-identity/biometric-keys/biometric-keys';
import {
  BiometricKeysController,
  biometricKeyOperations,
  type BiometricKeyOperations,
} from '../src/system-identity/biometric-keys/biometric-keys.controller';

describe('biometric keys (e2e)', () => {
  let app: INestApplication<App>;
  const bearer = `Bearer ${'a'.repeat(43)}`;
  const installation = 'installation-identifier-0001';
  const deviceKey = 'k'.repeat(43);
  const unlockSecret = 'u'.repeat(43);
  const client: AuthenticatedPrincipal = {
    accountId: 'account-id',
    authenticationSessionId: 'session-id',
    identity: { kind: 'client', clientId: 'client-id' },
  };
  const resolvePrincipal =
    jest.fn<
      (
        credential: string,
        meaningfulActivity: boolean,
        surface?: 'mobile' | 'admin_web',
      ) => Promise<AuthenticatedPrincipal>
    >();
  const issue = jest.fn<BiometricKeyOperations['issue']>();
  const exchange = jest.fn<BiometricKeyOperations['exchange']>();
  const revoke = jest.fn<BiometricKeyOperations['revoke']>();

  beforeEach(async () => {
    resolvePrincipal.mockResolvedValue(client);
    issue.mockResolvedValue({ deviceKey, unlockSecret });
    exchange.mockResolvedValue({ credential: 'c'.repeat(43), deviceKey });
    revoke.mockResolvedValue(undefined);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [BiometricKeysController],
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        {
          provide: biometricKeyOperations,
          useValue: { issue, exchange, revoke },
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

  describe('POST /api/v1/biometric-keys', () => {
    it('issues a key for this installation and never caches it', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/biometric-keys')
        .set('Authorization', bearer)
        .set('x-client-identifier', installation)
        .expect(201)
        .expect('Cache-Control', 'no-store')
        .expect({ deviceKey, unlockSecret });

      expect(issue).toHaveBeenCalledWith(client, {
        clientIdentifier: installation,
      });
    });

    it('needs a session', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/biometric-keys')
        .set('x-client-identifier', installation)
        .expect(401);
      expect(issue).not.toHaveBeenCalled();
    });

    it('refuses while an Administrator sees the app as a Staff Member', async () => {
      resolvePrincipal.mockResolvedValue({
        ...client,
        impersonation: {
          id: 'impersonation-id',
          administratorAccountId: 'administrator-account-id',
          staffMemberName: 'Camila Rojas',
          staffMemberGender: 'female',
          expiresAt: new Date('2026-11-23T13:00:00.000Z'),
        },
      });

      await request(app.getHttpServer())
        .post('/api/v1/biometric-keys')
        .set('Authorization', bearer)
        .set('x-client-identifier', installation)
        .expect(403)
        .expect(({ body }) =>
          expect(body).toMatchObject({ code: 'impersonation_forbidden' }),
        );
      expect(issue).not.toHaveBeenCalled();
    });

    it('answers 400 without an installation identifier', async () => {
      issue.mockRejectedValue(new MissingInstallationError());

      await request(app.getHttpServer())
        .post('/api/v1/biometric-keys')
        .set('Authorization', bearer)
        .expect(400)
        .expect(({ body }) =>
          expect(body).toMatchObject({ code: 'invalid_request' }),
        );
    });
  });

  describe('POST /api/v1/biometric-keys/exchange', () => {
    it('exchanges a key for a session and the next key', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/biometric-keys/exchange')
        .set('x-client-identifier', installation)
        .send({ deviceKey, unlockSecret })
        .expect(201)
        .expect('Cache-Control', 'no-store')
        .expect({ credential: 'c'.repeat(43), deviceKey });

      expect(exchange).toHaveBeenCalledWith({
        deviceKey,
        unlockSecret,
        clientIdentifier: installation,
        networkAddress: '::ffff:127.0.0.1',
      });
    });

    it('refuses a malformed body before reading any key', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/biometric-keys/exchange')
        .set('x-client-identifier', installation)
        .send({ deviceKey: 'short' })
        .expect(400)
        .expect(({ body }) =>
          expect(body).toMatchObject({ code: 'invalid_request' }),
        );
      expect(exchange).not.toHaveBeenCalled();
    });

    it('answers one stable problem for any key that no longer works', async () => {
      exchange.mockRejectedValue(new BiometricKeyRejectedError());

      await request(app.getHttpServer())
        .post('/api/v1/biometric-keys/exchange')
        .set('x-client-identifier', installation)
        .send({ deviceKey, unlockSecret })
        .expect(401)
        .expect(({ body }) =>
          expect(body).toMatchObject({ code: 'biometric_key_invalid' }),
        );
    });

    it('throttles like Login, with the server-computed wait', async () => {
      exchange.mockRejectedValue(new LoginThrottledError(42));

      await request(app.getHttpServer())
        .post('/api/v1/biometric-keys/exchange')
        .set('x-client-identifier', installation)
        .send({ deviceKey, unlockSecret })
        .expect(429)
        .expect('Retry-After', '42')
        .expect(({ body }) =>
          expect(body).toMatchObject({ code: 'login_throttled' }),
        );
    });

    it('answers 400 without an installation identifier', async () => {
      exchange.mockRejectedValue(new MissingInstallationError());

      await request(app.getHttpServer())
        .post('/api/v1/biometric-keys/exchange')
        .send({ deviceKey, unlockSecret })
        .expect(400);
    });
  });

  describe('POST /api/v1/biometric-keys/revocation', () => {
    it('turns the key off without a session and says nothing about it', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/biometric-keys/revocation')
        .set('x-client-identifier', installation)
        .send({ deviceKey })
        .expect(204);

      expect(revoke).toHaveBeenCalledWith({
        deviceKey,
        clientIdentifier: installation,
      });
    });

    it('refuses a malformed body', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/biometric-keys/revocation')
        .set('x-client-identifier', installation)
        .send({})
        .expect(400);
      expect(revoke).not.toHaveBeenCalled();
    });
  });
});
