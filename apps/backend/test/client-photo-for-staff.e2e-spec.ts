import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { ClientPhotoError } from '../src/booking/client/client-photo';
import { clientPhotoObjectStorage } from '../src/booking/client/client-photo.controller';
import {
  ClientPhotoForStaffController,
  clientPhotoForStaff,
  type ClientPhotoForStaffRead,
} from '../src/booking/client/client-photo-for-staff.controller';
import { BookingAccessDeniedError } from '../src/booking/commands/create-booking';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';

const imageAssetId = '22222222-2222-4222-8222-222222222222';

// Finding n.º 30: the staff see a Client's photo by the asset a list names.
describe('client photo for the staff (e2e)', () => {
  let app: INestApplication<App>;
  const bearer = `Bearer ${'a'.repeat(43)}`;
  const resolvePrincipal =
    jest.fn<(credential: string) => Promise<AuthenticatedPrincipal>>();
  const read = jest.fn<ClientPhotoForStaffRead>();
  const storage = { get: jest.fn<() => Promise<Buffer>>() };

  beforeEach(async () => {
    resolvePrincipal.mockResolvedValue({
      accountId: 'account-id',
      authenticationSessionId: 'session-id',
      identity: {
        kind: 'staff',
        staffMemberId: 'staff-id',
        role: 'trainer',
        branchIds: [],
      },
    });
    read.mockReset();
    read.mockResolvedValue({
      objectKey: `private/profile_photo/${imageAssetId}/thumbnail`,
      mediaType: 'image/jpeg',
    });
    storage.get.mockResolvedValue(Buffer.from('jpeg-bytes'));
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ClientPhotoForStaffController],
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        { provide: clientPhotoForStaff, useValue: read },
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

  it('streams the thumbnail privately with an ETag and answers 304 on a match', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/client-photos/${imageAssetId}`)
      .query({ variant: 'thumbnail' })
      .set('authorization', bearer)
      .expect(200)
      .expect('Content-Type', /image\/jpeg/)
      .expect('Cache-Control', 'private, no-cache');
    expect(read).toHaveBeenCalledWith(
      { imageAssetId, variant: 'thumbnail' },
      expect.anything(),
    );
    await request(app.getHttpServer())
      .get(`/api/v1/client-photos/${imageAssetId}`)
      .query({ variant: 'thumbnail' })
      .set('authorization', bearer)
      .set('if-none-match', response.headers.etag)
      .expect(304);
  });

  it('maps a Client caller, a missing photo and bad input', async () => {
    read.mockRejectedValueOnce(new BookingAccessDeniedError());
    await request(app.getHttpServer())
      .get(`/api/v1/client-photos/${imageAssetId}`)
      .set('authorization', bearer)
      .expect(403);
    read.mockRejectedValueOnce(new ClientPhotoError('profile_photo_not_found'));
    await request(app.getHttpServer())
      .get(`/api/v1/client-photos/${imageAssetId}`)
      .set('authorization', bearer)
      .expect(404);
    await request(app.getHttpServer())
      .get('/api/v1/client-photos/nope')
      .set('authorization', bearer)
      .expect(400);
    await request(app.getHttpServer())
      .get(`/api/v1/client-photos/${imageAssetId}`)
      .expect(401);
  });
});
