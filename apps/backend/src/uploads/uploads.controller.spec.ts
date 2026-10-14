import { Readable } from 'node:stream';
import { UnauthorizedException } from '@nestjs/common';
import { UploadAccessDeniedError } from './finalize-upload';
import { UploadsController } from './uploads.controller';

const principal = {
  accountId: 'account-id',
  authenticationSessionId: 'authentication-session-id',
  identity: { kind: 'client' as const, clientId: 'client-id' },
};

const validAuthorization = 'Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

describe('UploadsController', () => {
  const resolvePrincipal = jest.fn();
  const createPendingUpload = jest.fn();
  const putPendingUploadObject = jest.fn();
  const finalizeUpload = jest.fn();
  const readUploadStatus = jest.fn();
  const controller = new UploadsController(
    createPendingUpload,
    putPendingUploadObject,
    finalizeUpload,
    readUploadStatus,
    resolvePrincipal,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    resolvePrincipal.mockResolvedValue(principal);
  });

  it('creates a pending upload for the authenticated Account and returns a local upload target', async () => {
    createPendingUpload.mockResolvedValue({
      id: 'asset-id',
      pendingObjectKey: 'pending/transfer_receipt/asset-id',
      expiresAt: new Date('2026-09-21T12:15:00.000Z'),
    });

    await expect(
      controller.create(validAuthorization, {
        purpose: 'transfer_receipt',
        mediaType: 'image/jpeg',
        byteSize: 1_000,
        checksum: Buffer.alloc(32).toString('base64'),
      }),
    ).resolves.toEqual({
      id: 'asset-id',
      uploadUrl: '/api/v1/uploads/asset-id/object',
      expiresAt: new Date('2026-09-21T12:15:00.000Z'),
    });

    expect(createPendingUpload).toHaveBeenCalledWith({
      ownerAccountId: 'account-id',
      purpose: 'transfer_receipt',
      mediaType: 'image/jpeg',
      byteSize: 1_000,
      checksum: new Uint8Array(32),
    });
  });

  it('accepts the admin web session credential the cookie middleware sets (ADR-0084)', async () => {
    createPendingUpload.mockResolvedValue({
      id: 'asset-id',
      pendingObjectKey: 'pending/promotion/asset-id',
      expiresAt: new Date('2026-09-21T12:15:00.000Z'),
    });

    await expect(
      controller.create(
        'AdminSession AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        {
          purpose: 'promotion',
          mediaType: 'image/jpeg',
          byteSize: 1_000,
          checksum: Buffer.alloc(32).toString('base64'),
        },
      ),
    ).resolves.toMatchObject({ id: 'asset-id' });

    expect(resolvePrincipal).toHaveBeenCalledWith(
      'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      true,
      'admin_web',
    );
  });

  it('requires authentication to create a pending upload', async () => {
    await expect(
      controller.create(undefined, {
        purpose: 'transfer_receipt',
        mediaType: 'image/jpeg',
        byteSize: 1_000,
        checksum: Buffer.alloc(32).toString('base64'),
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(createPendingUpload).not.toHaveBeenCalled();
  });

  it('returns a stable problem code when a pending upload declaration is invalid', async () => {
    createPendingUpload.mockRejectedValue(new Error('image_too_large'));

    await expect(
      controller.create(validAuthorization, {
        purpose: 'profile_photo',
        mediaType: 'image/jpeg',
        byteSize: 999_999_999,
        checksum: Buffer.alloc(32).toString('base64'),
      }),
    ).rejects.toMatchObject({
      response: { code: 'image_too_large' },
      status: 400,
    });
  });

  it('writes the request body to a pending upload object', async () => {
    putPendingUploadObject.mockResolvedValue(undefined);
    const source = Readable.from([Buffer.from('bytes')]);

    await expect(
      controller.putObject(
        '11111111-1111-4111-8111-111111111111',
        validAuthorization,
        source,
      ),
    ).resolves.toBeUndefined();

    expect(putPendingUploadObject).toHaveBeenCalledWith(
      {
        imageAssetId: '11111111-1111-4111-8111-111111111111',
        bytes: Buffer.from('bytes'),
      },
      'account-id',
    );
  });

  it('returns a stable problem code when writing to an upload another Account owns', async () => {
    putPendingUploadObject.mockRejectedValue(new UploadAccessDeniedError());

    await expect(
      controller.putObject(
        '11111111-1111-4111-8111-111111111111',
        validAuthorization,
        Readable.from([Buffer.from('bytes')]),
      ),
    ).rejects.toMatchObject({
      response: { code: 'upload_access_denied' },
      status: 403,
    });
  });

  it('reports the processing state of an owned upload and hides others', async () => {
    const imageAssetId = '11111111-1111-4111-8111-111111111111';
    readUploadStatus.mockResolvedValue({
      id: imageAssetId,
      state: 'ready',
      mediaType: 'image/jpeg',
    });

    await expect(
      controller.status(imageAssetId, validAuthorization),
    ).resolves.toEqual({
      id: imageAssetId,
      state: 'ready',
      mediaType: 'image/jpeg',
    });
    expect(readUploadStatus).toHaveBeenCalledWith(imageAssetId, 'account-id');

    readUploadStatus.mockResolvedValue(null);
    await expect(
      controller.status(imageAssetId, validAuthorization),
    ).rejects.toMatchObject({
      status: 404,
      response: { code: 'upload_not_found' },
    });
    await expect(
      controller.status('nope', validAuthorization),
    ).rejects.toMatchObject({
      status: 400,
    });
  });

  it('finalizes an upload with its idempotency key', async () => {
    finalizeUpload.mockResolvedValue({ id: 'asset-id', state: 'processing' });

    await expect(
      controller.finalize(
        '11111111-1111-4111-8111-111111111111',
        validAuthorization,
        '22222222-2222-4222-8222-222222222222',
      ),
    ).resolves.toEqual({ id: 'asset-id', state: 'processing' });

    expect(finalizeUpload).toHaveBeenCalledWith(
      { imageAssetId: '11111111-1111-4111-8111-111111111111' },
      'account-id',
      '22222222-2222-4222-8222-222222222222',
    );
  });

  it('requires a UUID idempotency key to finalize an upload', async () => {
    await expect(
      controller.finalize(
        '11111111-1111-4111-8111-111111111111',
        validAuthorization,
        undefined,
      ),
    ).rejects.toMatchObject({ response: { code: 'invalid_request' } });

    expect(finalizeUpload).not.toHaveBeenCalled();
  });

  it('returns a stable problem code when finalizing an upload another Account owns', async () => {
    finalizeUpload.mockRejectedValue(new UploadAccessDeniedError());

    await expect(
      controller.finalize(
        '11111111-1111-4111-8111-111111111111',
        validAuthorization,
        '22222222-2222-4222-8222-222222222222',
      ),
    ).rejects.toMatchObject({
      response: { code: 'upload_access_denied' },
      status: 403,
    });
  });

  it('returns a stable problem code when an idempotency key is reused with a different request', async () => {
    finalizeUpload.mockRejectedValue(
      new Error('Idempotency Key was reused with a different request'),
    );

    await expect(
      controller.finalize(
        '11111111-1111-4111-8111-111111111111',
        validAuthorization,
        '22222222-2222-4222-8222-222222222222',
      ),
    ).rejects.toMatchObject({
      response: { code: 'idempotency_key_reused' },
      status: 409,
    });
  });
});
