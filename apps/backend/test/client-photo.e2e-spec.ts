import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { ClientPhotoError } from '../src/booking/client/client-photo';
import {
  ClientPhotoController,
  clientPhotoObjectStorage,
  clientPhotoOperations,
  type ClientPhotoOperations,
} from '../src/booking/client/client-photo.controller';
import { BookingAccessDeniedError } from '../src/booking/commands/create-booking';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';

const imageAssetId = '22222222-2222-4222-8222-222222222222';
const profile = {
  id: 'client-id',
  name: 'Lucía Fernández',
  email: 'lucia@example.com',
  phone: null,
  referralCode: 'REF-LUCIA',
  photo: { imageAssetId },
};

describe('client profile photo (e2e)', () => {
  let app: INestApplication<App>;
  const bearer = `Bearer ${'a'.repeat(43)}`;
  const resolvePrincipal =
    jest.fn<(credential: string) => Promise<AuthenticatedPrincipal>>();
  const operations = {
    set: jest.fn<ClientPhotoOperations['set']>(),
    remove: jest.fn<ClientPhotoOperations['remove']>(),
    read: jest.fn<ClientPhotoOperations['read']>(),
  };
  const storage = { get: jest.fn<() => Promise<Buffer>>() };

  beforeEach(async () => {
    resolvePrincipal.mockResolvedValue({
      accountId: 'account-id',
      authenticationSessionId: 'session-id',
      identity: { kind: 'client', clientId: 'client-id' },
    });
    Object.values(operations).forEach((operation) => operation.mockReset());
    operations.set.mockResolvedValue(profile);
    operations.remove.mockResolvedValue(undefined);
    operations.read.mockResolvedValue({
      objectKey: `private/profile_photo/${imageAssetId}/display`,
      mediaType: 'image/jpeg',
    });
    storage.get.mockResolvedValue(Buffer.from('jpeg-bytes'));

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ClientPhotoController],
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        { provide: clientPhotoOperations, useValue: operations },
        { provide: clientPhotoObjectStorage, useValue: storage },
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

  it('attaches an upload as the Client photo and returns the profile without caching', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/clients/current/photo')
      .set('authorization', bearer)
      .send({ imageAssetId })
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect(({ body }) => expect(body).toEqual(profile));
    expect(operations.set).toHaveBeenCalledWith(
      { imageAssetId },
      expect.objectContaining({ accountId: 'account-id' }),
    );
  });

  it('rejects a malformed body, an upload that is not ready, and a Staff caller', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/clients/current/photo')
      .set('authorization', bearer)
      .send({ imageAssetId: 'not-a-uuid' })
      .expect(400)
      .expect(({ body }) => expect(body).toMatchObject({ code: 'invalid_request' }));
    expect(operations.set).not.toHaveBeenCalled();

    operations.set.mockRejectedValueOnce(
      new ClientPhotoError('profile_photo_not_ready'),
    );
    await request(app.getHttpServer())
      .put('/api/v1/clients/current/photo')
      .set('authorization', bearer)
      .send({ imageAssetId })
      .expect(409)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'profile_photo_not_ready' }),
      );

    operations.set.mockRejectedValueOnce(new BookingAccessDeniedError());
    await request(app.getHttpServer())
      .put('/api/v1/clients/current/photo')
      .set('authorization', bearer)
      .send({ imageAssetId })
      .expect(403)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'booking_access_denied' }),
      );

    await request(app.getHttpServer())
      .put('/api/v1/clients/current/photo')
      .send({ imageAssetId })
      .expect(401);
  });

  it('removes the Client photo', async () => {
    await request(app.getHttpServer())
      .delete('/api/v1/clients/current/photo')
      .set('authorization', bearer)
      .expect(204);
    expect(operations.remove).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: 'account-id' }),
    );
    await request(app.getHttpServer())
      .delete('/api/v1/clients/current/photo')
      .expect(401);
  });

  it('streams the display variant by default and the thumbnail on request without caching', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/clients/current/photo')
      .set('authorization', bearer)
      .expect(200)
      .expect('Content-Type', /image\/jpeg/)
      .expect('Cache-Control', 'no-store')
      .expect('X-Content-Type-Options', 'nosniff')
      .expect(({ body }) =>
        expect(Buffer.from(body as Buffer).toString()).toBe('jpeg-bytes'),
      );
    expect(operations.read).toHaveBeenCalledWith(
      { variant: 'display' },
      expect.anything(),
    );
    expect(storage.get).toHaveBeenCalledWith(
      `private/profile_photo/${imageAssetId}/display`,
    );

    await request(app.getHttpServer())
      .get('/api/v1/clients/current/photo')
      .query({ variant: 'thumbnail' })
      .set('authorization', bearer)
      .expect(200);
    expect(operations.read).toHaveBeenLastCalledWith(
      { variant: 'thumbnail' },
      expect.anything(),
    );

    await request(app.getHttpServer())
      .get('/api/v1/clients/current/photo')
      .query({ variant: 'original' })
      .set('authorization', bearer)
      .expect(400);

    operations.read.mockRejectedValueOnce(
      new ClientPhotoError('profile_photo_not_found'),
    );
    await request(app.getHttpServer())
      .get('/api/v1/clients/current/photo')
      .set('authorization', bearer)
      .expect(404)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'profile_photo_not_found' }),
      );
  });
});
