import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import {
  DevicesController,
  deviceDeactivation,
  deviceRegistration,
} from '../src/notifications/devices/devices.controller';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';

describe('account devices (e2e)', () => {
  let app: INestApplication<App>;
  const bearer = `Bearer ${'a'.repeat(43)}`;
  const register = jest.fn<() => Promise<void>>();
  const deactivate = jest.fn<() => Promise<void>>();
  const installationId = '3f0d4c1e-7c1b-4a8e-9a55-5d7c3b2a1f00';

  beforeEach(async () => {
    register.mockReset().mockResolvedValue(undefined);
    deactivate.mockReset().mockResolvedValue(undefined);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [DevicesController],
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
        { provide: deviceRegistration, useValue: register },
        { provide: deviceDeactivation, useValue: deactivate },
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('registers the current device with no content and no caching', async () => {
    const response = await request(app.getHttpServer())
      .put('/api/v1/notifications/devices/current')
      .set('Authorization', bearer)
      .send({
        installationId,
        expoPushToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: 'android',
      })
      .expect(204);

    expect(response.headers['cache-control']).toBe('no-store');
    expect(register).toHaveBeenCalledTimes(1);
  });

  it('answers an invalid registration as a problem', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/notifications/devices/current')
      .set('Authorization', bearer)
      .send({ installationId, expoPushToken: 'nope', platform: 'android' })
      .expect(400)
      .expect(({ body }: { body: { code: string } }) => {
        expect(body.code).toBe('invalid_request');
      });
  });

  it('deactivates the current device with no content', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/notifications/devices/current/deactivate')
      .set('Authorization', bearer)
      .send({ installationId })
      .expect(204);

    expect(deactivate).toHaveBeenCalledTimes(1);
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/notifications/devices/current/deactivate')
      .send({ installationId })
      .expect(401);
  });
});
