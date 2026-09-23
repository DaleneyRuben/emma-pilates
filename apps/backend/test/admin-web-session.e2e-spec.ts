import type { INestApplication } from '@nestjs/common';
import { jest } from '@jest/globals';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AuthenticationFailedError } from '../src/system-identity/authentication/authenticate-credentials';
import { LoginThrottledError } from '../src/system-identity/authentication/login';
import { AuthenticationRequiredError } from '../src/system-identity/authentication/resolve-authenticated-principal';
import {
  administrator,
  cookiesOf,
  credential,
  executeLogin,
  executeLogout,
  resolvePrincipal,
  sessionCookie,
  startAdminWebApp,
  trustedOrigin,
} from './admin-web-test-app';

describe('admin-web Authentication Sessions (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    app = await startAdminWebApp();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('Login', () => {
    it('delivers the session as a host-only Secure HttpOnly SameSite=Lax cookie, never in the body', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin-web/authentication-sessions')
        .set('Origin', trustedOrigin)
        .send({ email: 'paola@example.com', password: 'correct password' })
        .expect(201);

      expect(JSON.stringify(response.body)).not.toContain(credential);
      expect(response.body).toEqual({
        accountId: 'account-id',
        identity: administrator.identity,
      });
      const session = cookiesOf(response).find((cookie) =>
        cookie.startsWith('__Host-emma-admin-session='),
      );
      expect(session).toBeDefined();
      expect(session).toContain(`__Host-emma-admin-session=${credential}`);
      expect(session).toMatch(/; Path=\//);
      expect(session).toMatch(/; Max-Age=43200/);
      expect(session).toMatch(/; HttpOnly/);
      expect(session).toMatch(/; Secure/);
      expect(session).toMatch(/; SameSite=Lax/);
      expect(session).not.toMatch(/Domain=/i);
      expect(executeLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'paola@example.com',
          surface: 'admin_web',
        }),
      );
    });

    it('issues a random browser identifier cookie and reuses it as the throttling client signal', async () => {
      const first = await request(app.getHttpServer())
        .post('/api/v1/admin-web/authentication-sessions')
        .set('Origin', trustedOrigin)
        .send({ email: 'paola@example.com', password: 'correct password' })
        .expect(201);
      const clientCookie = cookiesOf(first).find((cookie) =>
        cookie.startsWith('__Host-emma-admin-client='),
      );
      expect(clientCookie).toMatch(/; HttpOnly/);
      expect(clientCookie).toMatch(/; Secure/);
      const identifier = /^__Host-emma-admin-client=([A-Za-z0-9_-]+);/.exec(
        clientCookie ?? '',
      )?.[1];
      expect(identifier).toHaveLength(43);
      expect(executeLogin.mock.calls[0]?.[0].clientIdentifier).toBe(identifier);

      const second = await request(app.getHttpServer())
        .post('/api/v1/admin-web/authentication-sessions')
        .set('Origin', trustedOrigin)
        .set('Cookie', `__Host-emma-admin-client=${identifier}`)
        .send({ email: 'paola@example.com', password: 'correct password' })
        .expect(201);
      expect(executeLogin.mock.calls[1]?.[0].clientIdentifier).toBe(identifier);
      expect(
        cookiesOf(second).some((cookie) =>
          cookie.startsWith('__Host-emma-admin-client='),
        ),
      ).toBe(false);
    });

    it('answers every rejected Login, including a non-Administrator, with the neutral failure and no session cookie', async () => {
      executeLogin.mockRejectedValue(new AuthenticationFailedError());

      const response = await request(app.getHttpServer())
        .post('/api/v1/admin-web/authentication-sessions')
        .set('Origin', trustedOrigin)
        .send({ email: 'camila@example.com', password: 'correct password' })
        .expect(401)
        .expect('Content-Type', /application\/problem\+json/);

      expect(response.body).toEqual(
        expect.objectContaining({ code: 'authentication_failed' }),
      );
      expect(
        cookiesOf(response).some((cookie) =>
          cookie.startsWith('__Host-emma-admin-session='),
        ),
      ).toBe(false);
    });

    it('returns the throttling problem with Retry-After', async () => {
      executeLogin.mockRejectedValue(new LoginThrottledError(30));

      await request(app.getHttpServer())
        .post('/api/v1/admin-web/authentication-sessions')
        .set('Origin', trustedOrigin)
        .send({ email: 'paola@example.com', password: 'wrong password' })
        .expect(429)
        .expect('Retry-After', '30')
        .expect(({ body }) => {
          expect(body).toEqual(
            expect.objectContaining({ code: 'login_throttled' }),
          );
        });
    });

    it.each([
      ['another origin', 'https://attacker.example'],
      ['a lookalike origin', 'http://localhost:5173.attacker.example'],
      ['a missing origin', undefined],
    ])('refuses a Login from %s', async (_label, origin) => {
      const call = request(app.getHttpServer()).post(
        '/api/v1/admin-web/authentication-sessions',
      );
      if (origin !== undefined) call.set('Origin', origin);

      await call
        .send({ email: 'paola@example.com', password: 'correct password' })
        .expect(403)
        .expect(({ body }) => {
          expect(body).toEqual(
            expect.objectContaining({ code: 'untrusted_origin' }),
          );
        });
      expect(executeLogin).not.toHaveBeenCalled();
    });
  });

  describe('current session', () => {
    it('resolves the browser cookie through the admin-web surface', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin-web/authentication-sessions/current')
        .set('Cookie', sessionCookie)
        .expect(200)
        .expect({ accountId: 'account-id', identity: administrator.identity });

      expect(resolvePrincipal).toHaveBeenCalledWith(
        credential,
        true,
        'admin_web',
      );
    });

    it('does not accept a bearer credential or a forged AdminSession header', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin-web/authentication-sessions/current')
        .set('Authorization', `Bearer ${credential}`)
        .expect(401);
      await request(app.getHttpServer())
        .get('/api/v1/admin-web/authentication-sessions/current')
        .set('Authorization', `AdminSession ${credential}`)
        .expect(401);
      expect(resolvePrincipal).not.toHaveBeenCalledWith(
        credential,
        true,
        'admin_web',
      );
    });

    it('treats a browser session whose Account is no longer an Administrator as signed out', async () => {
      resolvePrincipal.mockResolvedValue({
        ...administrator,
        identity: {
          kind: 'staff',
          staffMemberId: 'staff-member-id',
          role: 'assistant',
          branchIds: ['branch-id'],
        },
      });

      await request(app.getHttpServer())
        .get('/api/v1/admin-web/authentication-sessions/current')
        .set('Cookie', sessionCookie)
        .expect(401)
        .expect(({ body }) => {
          expect(body).toEqual(
            expect.objectContaining({ code: 'authentication_required' }),
          );
        });
    });

    it('answers an expired or revoked cookie with authentication_required', async () => {
      resolvePrincipal.mockRejectedValue(new AuthenticationRequiredError());

      await request(app.getHttpServer())
        .get('/api/v1/admin-web/authentication-sessions/current')
        .set('Cookie', sessionCookie)
        .expect(401);
    });
  });

  describe('logout', () => {
    it('revokes the browser session and clears its cookie', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/v1/admin-web/authentication-sessions/current')
        .set('Origin', trustedOrigin)
        .set('Cookie', sessionCookie)
        .expect(204);

      expect(executeLogout).toHaveBeenCalledWith('authentication-session-id');
      const cleared = cookiesOf(response).find((cookie) =>
        cookie.startsWith('__Host-emma-admin-session='),
      );
      expect(cleared).toMatch(/^__Host-emma-admin-session=;/);
      expect(cleared).toMatch(/; Max-Age=0/);
    });

    it('still clears the cookie when the session had already ended', async () => {
      resolvePrincipal.mockRejectedValue(new AuthenticationRequiredError());

      const response = await request(app.getHttpServer())
        .delete('/api/v1/admin-web/authentication-sessions/current')
        .set('Origin', trustedOrigin)
        .set('Cookie', sessionCookie)
        .expect(204);

      expect(executeLogout).not.toHaveBeenCalled();
      expect(
        cookiesOf(response).some((cookie) =>
          cookie.startsWith('__Host-emma-admin-session=;'),
        ),
      ).toBe(true);
    });

    it('refuses a cross-origin logout', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/admin-web/authentication-sessions/current')
        .set('Origin', 'https://attacker.example')
        .set('Cookie', sessionCookie)
        .expect(403);
      expect(executeLogout).not.toHaveBeenCalled();
    });
  });
});
