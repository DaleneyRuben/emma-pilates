import type { INestApplication } from '@nestjs/common';
import { jest } from '@jest/globals';
import request from 'supertest';
import type { App } from 'supertest/types';
import {
  changePassword,
  completeRecovery,
  cookiesOf,
  credential,
  resolvePrincipal,
  sessionCookie,
  startAdminWebApp,
  trustedOrigin,
} from './admin-web-test-app';

describe('admin-web cookie-authenticated requests (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    app = await startAdminWebApp();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('state-changing requests authenticated by the cookie', () => {
    it('changes the password through the existing use case from the trusted origin', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/accounts/current/password')
        .set('Origin', trustedOrigin)
        .set('Cookie', sessionCookie)
        .send({ currentPassword: 'old password', newPassword: 'new password' })
        .expect(204);

      expect(resolvePrincipal).toHaveBeenCalledWith(
        credential,
        true,
        'admin_web',
      );
      expect(changePassword).toHaveBeenCalledWith({
        accountId: 'account-id',
        authenticationSessionId: 'authentication-session-id',
        currentPassword: 'old password',
        newPassword: 'new password',
      });
    });

    it('refuses a cookie-authenticated change from another origin before any work', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/accounts/current/password')
        .set('Origin', 'https://attacker.example')
        .set('Cookie', sessionCookie)
        .send({ currentPassword: 'old password', newPassword: 'new password' })
        .expect(403)
        .expect(({ body }) => {
          expect(body).toEqual(
            expect.objectContaining({ code: 'untrusted_origin' }),
          );
        });
      expect(resolvePrincipal).not.toHaveBeenCalled();
      expect(changePassword).not.toHaveBeenCalled();
    });

    it('keeps bearer requests from the mobile apps free of the origin check', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/accounts/current/password')
        .set('Authorization', `Bearer ${credential}`)
        .send({ currentPassword: 'old password', newPassword: 'new password' })
        .expect(204);

      expect(resolvePrincipal).toHaveBeenCalledWith(credential, true, 'mobile');
    });
  });

  describe('password recovery completion', () => {
    it('opens the replacement browser session as a cookie', async () => {
      completeRecovery.mockResolvedValue({ status: 'recovered', credential });

      const response = await request(app.getHttpServer())
        .post('/api/v1/admin-web/password-recoveries')
        .set('Origin', trustedOrigin)
        .send({ token: 'recovery-secret', password: 'new password' })
        .expect(200)
        .expect({ status: 'recovered', signedIn: true });

      expect(
        cookiesOf(response).some((cookie) =>
          cookie.startsWith(`__Host-emma-admin-session=${credential};`),
        ),
      ).toBe(true);
    });

    it.each([
      [{ status: 'recovered' }, { status: 'recovered', signedIn: false }],
      [{ status: 'expired' }, { status: 'expired', signedIn: false }],
      [{ status: 'invalid' }, { status: 'invalid', signedIn: false }],
    ])('answers %p without a session cookie', async (result, body) => {
      completeRecovery.mockResolvedValue(result);

      const response = await request(app.getHttpServer())
        .post('/api/v1/admin-web/password-recoveries')
        .set('Origin', trustedOrigin)
        .send({ token: 'recovery-secret', password: 'new password' })
        .expect(200)
        .expect(body);

      expect(
        cookiesOf(response).some((cookie) =>
          cookie.startsWith('__Host-emma-admin-session='),
        ),
      ).toBe(false);
    });

    it('refuses a recovery completion from another origin', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin-web/password-recoveries')
        .set('Origin', 'https://attacker.example')
        .send({ token: 'recovery-secret', password: 'new password' })
        .expect(403);
      expect(completeRecovery).not.toHaveBeenCalled();
    });
  });
});
