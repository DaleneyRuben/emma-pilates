import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { AdministrationError } from '../src/booking/administration/administration-errors';
import type { StudioTransferQr } from '../src/booking/transfer-qr/prisma-studio-transfer-qr';
import {
  studioTransferQrControllers,
  studioTransferQrOperations,
} from '../src/booking/transfer-qr/studio-transfer-qr.controller';
import { TransferQrError } from '../src/booking/transfer-qr/transfer-qr-image';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';

const path = '/api/v1/administrator/transfer-qr';
const bearer = `Bearer ${'a'.repeat(43)}`;
const staff = (
  role: 'administrator' | 'coordinator',
): AuthenticatedPrincipal => ({
  accountId: `${role}-account`,
  authenticationSessionId: 'session-id',
  identity: {
    kind: 'staff',
    staffMemberId: `${role}-staff`,
    role,
    branchIds: [],
  },
});
const updatedAt = new Date('2026-11-04T14:00:00.000Z');
const png = Buffer.from('89504e470d0a1a0a0000000d', 'hex');

describe('studio transfer QR (e2e)', () => {
  let app: INestApplication<App>;
  const resolvePrincipal =
    jest.fn<(credential: string) => Promise<AuthenticatedPrincipal>>();
  const operations = {
    read: jest.fn<StudioTransferQr['read']>(),
    replace: jest.fn<StudioTransferQr['replace']>(),
  };

  beforeEach(async () => {
    resolvePrincipal.mockResolvedValue(staff('administrator'));
    operations.read.mockReset().mockResolvedValue({ updatedAt });
    operations.replace.mockReset().mockResolvedValue({ updatedAt });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [...studioTransferQrControllers],
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        { provide: studioTransferQrOperations, useValue: operations },
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

  it('tells the Administrator when the QR was replaced, without caching', async () => {
    await request(app.getHttpServer())
      .get(path)
      .set('authorization', bearer)
      .expect(200)
      .expect('cache-control', 'no-store')
      .expect({ updatedAt: '2026-11-04T14:00:00.000Z' });
  });

  it('answers a null date while the server file is still in use', async () => {
    operations.read.mockResolvedValue({ updatedAt: null });

    await request(app.getHttpServer())
      .get(path)
      .set('authorization', bearer)
      .expect(200)
      .expect({ updatedAt: null });
  });

  it.each(['image/png', 'image/jpeg', 'image/webp'])(
    'replaces the QR with the raw %s bytes',
    async (mediaType) => {
      await request(app.getHttpServer())
        .put(path)
        .set('authorization', bearer)
        .set('content-type', mediaType)
        .send(png)
        .expect(200)
        .expect('cache-control', 'no-store')
        .expect({ updatedAt: '2026-11-04T14:00:00.000Z' });
      expect(operations.replace).toHaveBeenCalledWith(
        staff('administrator'),
        png,
      );
    },
  );

  it.each(['image/gif', 'application/json', 'text/plain'])(
    'refuses a %s body before reading it',
    async (mediaType) => {
      await request(app.getHttpServer())
        .put(path)
        .set('authorization', bearer)
        .set('content-type', mediaType)
        .send(mediaType === 'application/json' ? '{}' : 'GIF89a')
        .expect(400)
        .expect('content-type', /application\/problem\+json/)
        .expect(({ body }: { body: { code: string } }) => {
          expect(body.code).toBe('transfer_qr_invalid_image');
        });
      expect(operations.replace).not.toHaveBeenCalled();
    },
  );

  it('refuses more than 5 MB with 413', async () => {
    await request(app.getHttpServer())
      .put(path)
      .set('authorization', bearer)
      .set('content-type', 'image/png')
      .send(Buffer.alloc(5 * 1024 * 1024 + 1))
      .expect(413)
      .expect(({ body }: { body: { code: string } }) => {
        expect(body.code).toBe('transfer_qr_too_large');
      });
    expect(operations.replace).not.toHaveBeenCalled();
  });

  it.each(['transfer_qr_invalid_image', 'transfer_qr_too_large'] as const)(
    'answers %s with 400 when the image itself is refused',
    async (code) => {
      operations.replace.mockRejectedValue(new TransferQrError(code));

      await request(app.getHttpServer())
        .put(path)
        .set('authorization', bearer)
        .set('content-type', 'image/png')
        .send(png)
        .expect(400)
        .expect(({ body }: { body: { code: string } }) => {
          expect(body.code).toBe(code);
        });
    },
  );

  it('refuses the Coordinator on both routes and never reads her upload', async () => {
    resolvePrincipal.mockResolvedValue(staff('coordinator'));
    operations.read.mockRejectedValue(
      new AdministrationError('administration_access_denied'),
    );

    await request(app.getHttpServer())
      .get(path)
      .set('authorization', bearer)
      .expect(403);
    await request(app.getHttpServer())
      .put(path)
      .set('authorization', bearer)
      .set('content-type', 'image/png')
      .send(png)
      .expect(403)
      .expect(({ body }: { body: { code: string } }) => {
        expect(body.code).toBe('administration_access_denied');
      });
    expect(operations.replace).not.toHaveBeenCalled();
  });

  it('requires a credential', async () => {
    await request(app.getHttpServer()).get(path).expect(401);
    await request(app.getHttpServer())
      .put(path)
      .set('content-type', 'image/png')
      .send(png)
      .expect(401);
  });
});
