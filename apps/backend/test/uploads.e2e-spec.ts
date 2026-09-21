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
  createPendingUploadCommand,
  finalizeUploadCommand,
  putPendingUploadObjectCommand,
  UploadsController,
  uploadsNodeEnv,
} from '../src/uploads/uploads.controller';

describe('uploads (e2e)', () => {
  let app: INestApplication<App>;
  const opaqueCredential = 'a'.repeat(43);
  const createPendingUpload = jest.fn<(command: unknown) => Promise<unknown>>();
  const putPendingUploadObject =
    jest.fn<(command: unknown, ownerAccountId: string) => Promise<void>>();
  const finalizeUpload =
    jest.fn<
      (
        command: unknown,
        ownerAccountId: string,
        idempotencyKey: string,
      ) => Promise<unknown>
    >();
  const resolvePrincipal =
    jest.fn<
      (
        credential: string,
        meaningfulActivity: boolean,
      ) => Promise<AuthenticatedPrincipal>
    >();

  beforeEach(async () => {
    resolvePrincipal.mockResolvedValue({
      accountId: 'account-id',
      authenticationSessionId: 'authentication-session-id',
      identity: { kind: 'client', clientId: 'client-id' },
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UploadsController],
      providers: [
        { provide: createPendingUploadCommand, useValue: createPendingUpload },
        {
          provide: putPendingUploadObjectCommand,
          useValue: putPendingUploadObject,
        },
        { provide: finalizeUploadCommand, useValue: finalizeUpload },
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        { provide: uploadsNodeEnv, useValue: 'test' },
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

  it('creates a pending upload for the authenticated Account', async () => {
    createPendingUpload.mockResolvedValue({
      id: 'asset-id',
      pendingObjectKey: 'pending/transfer_receipt/asset-id',
      expiresAt: new Date('2026-09-21T12:15:00.000Z'),
    });

    await request(app.getHttpServer())
      .post('/api/v1/uploads')
      .set('Authorization', `Bearer ${opaqueCredential}`)
      .send({
        purpose: 'transfer_receipt',
        mediaType: 'image/jpeg',
        byteSize: 1_000,
        checksum: Buffer.alloc(32).toString('base64'),
      })
      .expect(201)
      .expect({
        id: 'asset-id',
        uploadUrl: '/api/v1/uploads/asset-id/object',
        expiresAt: '2026-09-21T12:15:00.000Z',
      });
  });

  it('writes raw bytes sent over HTTP to the pending upload object', async () => {
    putPendingUploadObject.mockResolvedValue(undefined);
    const bytes = Buffer.from('a real request body sent as raw bytes');

    await request(app.getHttpServer())
      .put('/api/v1/uploads/11111111-1111-4111-8111-111111111111/object')
      .set('Authorization', `Bearer ${opaqueCredential}`)
      .set('Content-Type', 'application/octet-stream')
      .send(bytes)
      .expect(204);

    expect(putPendingUploadObject).toHaveBeenCalledWith(
      { imageAssetId: '11111111-1111-4111-8111-111111111111', bytes },
      'account-id',
    );
  });

  it('finalizes an upload given a valid idempotency key', async () => {
    finalizeUpload.mockResolvedValue({ id: 'asset-id', state: 'processing' });

    await request(app.getHttpServer())
      .post('/api/v1/uploads/11111111-1111-4111-8111-111111111111/finalize')
      .set('Authorization', `Bearer ${opaqueCredential}`)
      .set('Idempotency-Key', '22222222-2222-4222-8222-222222222222')
      .expect(202)
      .expect({ id: 'asset-id', state: 'processing' });
  });

  it('rejects finalizing an upload without an idempotency key', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/uploads/11111111-1111-4111-8111-111111111111/finalize')
      .set('Authorization', `Bearer ${opaqueCredential}`)
      .expect('Content-Type', /application\/problem\+json/)
      .expect(400)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({ code: 'invalid_request' }),
        );
      });

    expect(finalizeUpload).not.toHaveBeenCalled();
  });
});
