import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { StaffPhotoError } from '../src/booking/staff/photo/staff-photo';
import {
  StaffPhotoController,
  staffPhotoObjectStorage,
  staffPhotoOperations,
  type StaffPhotoOperations,
} from '../src/booking/staff/photo/staff-photo.controller';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';

const imageAssetId = '22222222-2222-4222-8222-222222222222';
const staffMemberId = '33333333-3333-4333-8333-333333333333';
const result = { staffMemberId, photo: { imageAssetId } };

describe('staff profile photo (e2e)', () => {
  let app: INestApplication<App>;
  const bearer = `Bearer ${'a'.repeat(43)}`;
  const resolvePrincipal =
    jest.fn<(credential: string) => Promise<AuthenticatedPrincipal>>();
  const operations = {
    setOwn: jest.fn<StaffPhotoOperations['setOwn']>(),
    removeOwn: jest.fn<StaffPhotoOperations['removeOwn']>(),
    setMember: jest.fn<StaffPhotoOperations['setMember']>(),
    removeMember: jest.fn<StaffPhotoOperations['removeMember']>(),
    read: jest.fn<StaffPhotoOperations['read']>(),
  };
  const storage = { get: jest.fn<() => Promise<Buffer>>() };

  beforeEach(async () => {
    resolvePrincipal.mockResolvedValue({
      accountId: 'account-id',
      authenticationSessionId: 'session-id',
      identity: {
        kind: 'staff',
        staffMemberId: 'own-staff',
        role: 'coordinator',
        branchIds: [],
      },
    });
    Object.values(operations).forEach((operation) => operation.mockReset());
    operations.setOwn.mockResolvedValue(result);
    operations.removeOwn.mockResolvedValue({ staffMemberId, photo: null });
    operations.setMember.mockResolvedValue(result);
    operations.removeMember.mockResolvedValue({ staffMemberId, photo: null });
    operations.read.mockResolvedValue({
      objectKey: `private/profile_photo/${imageAssetId}/thumbnail`,
      mediaType: 'image/jpeg',
    });
    storage.get.mockResolvedValue(Buffer.from('jpeg-bytes'));

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [StaffPhotoController],
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        { provide: staffPhotoOperations, useValue: operations },
        { provide: staffPhotoObjectStorage, useValue: storage },
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

  it('sets and removes the signed-in Staff Member photo without caching', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/staff-members/current/photo')
      .set('authorization', bearer)
      .send({ imageAssetId })
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect(({ body }) => expect(body).toEqual(result));
    expect(operations.setOwn).toHaveBeenCalledWith(
      { imageAssetId },
      expect.objectContaining({ accountId: 'account-id' }),
    );

    await request(app.getHttpServer())
      .delete('/api/v1/staff-members/current/photo')
      .set('authorization', bearer)
      .expect(204);
    expect(operations.removeOwn).toHaveBeenCalled();

    await request(app.getHttpServer())
      .put('/api/v1/staff-members/current/photo')
      .send({ imageAssetId })
      .expect(401);
  });

  it('sets and removes another member photo for the Administrator or the Coordinator', async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/administrator/staff-members/${staffMemberId}/photo`)
      .set('authorization', bearer)
      .send({ imageAssetId })
      .expect(200)
      .expect(({ body }) => expect(body).toEqual(result));
    expect(operations.setMember).toHaveBeenCalledWith(
      { staffMemberId, imageAssetId },
      expect.anything(),
    );

    await request(app.getHttpServer())
      .delete(`/api/v1/administrator/staff-members/${staffMemberId}/photo`)
      .set('authorization', bearer)
      .expect(204);
    expect(operations.removeMember).toHaveBeenCalledWith(
      { staffMemberId },
      expect.anything(),
    );
  });

  it('maps malformed input and the domain refusals to problem codes', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/staff-members/current/photo')
      .set('authorization', bearer)
      .send({ imageAssetId: 'nope' })
      .expect(400)
      .expect(({ body }: { body: { code: string } }) =>
        expect(body.code).toBe('invalid_request'),
      );
    await request(app.getHttpServer())
      .put('/api/v1/administrator/staff-members/not-a-uuid/photo')
      .set('authorization', bearer)
      .send({ imageAssetId })
      .expect(400);

    const refusals: [StaffPhotoError['code'], number][] = [
      ['profile_photo_not_ready', 409],
      ['staff_access_denied', 403],
      ['staff_member_not_found', 404],
      ['staff_member_deactivated', 409],
    ];
    for (const [code, status] of refusals) {
      operations.setMember.mockRejectedValueOnce(new StaffPhotoError(code));
      await request(app.getHttpServer())
        .put(`/api/v1/administrator/staff-members/${staffMemberId}/photo`)
        .set('authorization', bearer)
        .send({ imageAssetId })
        .expect(status)
        .expect(({ body }: { body: { code: string } }) =>
          expect(body.code).toBe(code),
        );
    }
  });

  it('streams a staff photo by asset with a private revalidated cache and an ETag', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/staff-photos/${imageAssetId}`)
      .query({ variant: 'thumbnail' })
      .set('authorization', bearer)
      .expect(200)
      .expect('Content-Type', /image\/jpeg/)
      .expect('Cache-Control', 'private, no-cache')
      .expect('X-Content-Type-Options', 'nosniff');
    expect(Buffer.from(response.body as Buffer).toString()).toBe('jpeg-bytes');
    expect(operations.read).toHaveBeenCalledWith(
      { imageAssetId, variant: 'thumbnail' },
      expect.anything(),
    );
    const etag = response.headers.etag;
    expect(etag).toBe(`"${imageAssetId}-thumbnail"`);

    await request(app.getHttpServer())
      .get(`/api/v1/staff-photos/${imageAssetId}`)
      .query({ variant: 'thumbnail' })
      .set('authorization', bearer)
      .set('if-none-match', etag)
      .expect(304);

    await request(app.getHttpServer())
      .get(`/api/v1/staff-photos/${imageAssetId}`)
      .set('authorization', bearer)
      .expect(200);
    expect(operations.read).toHaveBeenLastCalledWith(
      { imageAssetId, variant: 'display' },
      expect.anything(),
    );

    operations.read.mockRejectedValueOnce(
      new StaffPhotoError('profile_photo_not_found'),
    );
    await request(app.getHttpServer())
      .get(`/api/v1/staff-photos/${imageAssetId}`)
      .set('authorization', bearer)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/api/v1/staff-photos/${imageAssetId}`)
      .query({ variant: 'huge' })
      .set('authorization', bearer)
      .expect(400);
    await request(app.getHttpServer())
      .get(`/api/v1/staff-photos/${imageAssetId}`)
      .expect(401);
  });
});
