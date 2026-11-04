import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import type { ObjectStorage } from '../../uploads/object-storage';
import {
  normalizeTransferQr,
  readTransferQr,
  TransferQrError,
  transferQrStorageKey,
} from './transfer-qr-image';

const image = (width: number, height: number) =>
  sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 20, g: 20, b: 20 },
    },
  });

const rejection = async (bytes: Buffer): Promise<unknown> =>
  normalizeTransferQr(bytes).then(
    () => null,
    (error: unknown) => error,
  );

describe('normalizeTransferQr', () => {
  it('re-encodes a JPEG as PNG and reports its size and digest', async () => {
    const jpeg = await image(40, 30).jpeg().toBuffer();

    const normalized = await normalizeTransferQr(jpeg);

    const metadata = await sharp(normalized.png).metadata();
    expect(metadata.format).toBe('png');
    expect(normalized).toMatchObject({
      width: 40,
      height: 30,
      byteSize: normalized.png.byteLength,
      sha256: createHash('sha256').update(normalized.png).digest('hex'),
    });
  });

  it('accepts PNG and WebP', async () => {
    for (const bytes of [
      await image(12, 12).png().toBuffer(),
      await image(12, 12).webp().toBuffer(),
    ]) {
      await expect(normalizeTransferQr(bytes)).resolves.toMatchObject({
        width: 12,
        height: 12,
      });
    }
  });

  it('applies the EXIF orientation and strips the metadata', async () => {
    const rotated = await image(40, 20)
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();

    const normalized = await normalizeTransferQr(rotated);

    const metadata = await sharp(normalized.png).metadata();
    expect([normalized.width, normalized.height]).toEqual([20, 40]);
    expect(metadata.orientation).toBeUndefined();
    expect(metadata.exif).toBeUndefined();
  });

  it.each([
    ['bytes that are not an image', Buffer.from('not an image at all')],
    ['nothing', Buffer.alloc(0)],
  ])('refuses %s', async (_name, bytes) => {
    const error = await rejection(bytes);
    expect(error).toBeInstanceOf(TransferQrError);
    expect(error).toMatchObject({ code: 'transfer_qr_invalid_image' });
  });

  it('refuses an image format other than JPEG, PNG or WebP', async () => {
    const gif = await image(10, 10).gif().toBuffer();
    await expect(rejection(gif)).resolves.toMatchObject({
      code: 'transfer_qr_invalid_image',
    });
  });

  it('refuses an image whose longest side is over 4096 pixels', async () => {
    const wide = await image(4097, 8).png().toBuffer();
    await expect(rejection(wide)).resolves.toMatchObject({
      code: 'transfer_qr_too_large',
    });
    await expect(
      normalizeTransferQr(await image(4096, 8).png().toBuffer()),
    ).resolves.toMatchObject({ width: 4096 });
  });

  it('refuses more than 5 MB of bytes', async () => {
    await expect(
      rejection(Buffer.alloc(5 * 1024 * 1024 + 1)),
    ).resolves.toMatchObject({ code: 'transfer_qr_too_large' });
  });
});

describe('readTransferQr', () => {
  const fallbackDirectory = mkdtempSync(join(tmpdir(), 'pilates-qr-read-'));
  const fallbackPath = join(fallbackDirectory, 'qr.png');
  writeFileSync(fallbackPath, Buffer.from('server file'));

  const storageAnswering = (answer: ObjectStorage['get']): ObjectStorage => ({
    put: jest.fn(),
    replace: jest.fn(),
    delete: jest.fn(),
    get: answer,
  });

  it('serves the uploaded QR from storage', async () => {
    const get = jest.fn(() => Promise.resolve(Buffer.from('uploaded')));

    await expect(
      readTransferQr(storageAnswering(get), fallbackPath),
    ).resolves.toEqual(Buffer.from('uploaded'));
    expect(get).toHaveBeenCalledWith(transferQrStorageKey);
  });

  it('falls back on the server file while nothing was uploaded', async () => {
    const storage = storageAnswering(() =>
      Promise.reject(Object.assign(new Error('missing'), { code: 'ENOENT' })),
    );

    await expect(readTransferQr(storage, fallbackPath)).resolves.toEqual(
      Buffer.from('server file'),
    );
  });

  it('never serves the server file when storage fails', async () => {
    const outage = Object.assign(new Error('Service Unavailable'), {
      $metadata: { httpStatusCode: 503 },
    });
    const storage = storageAnswering(() => Promise.reject(outage));

    await expect(readTransferQr(storage, fallbackPath)).rejects.toBe(outage);
  });

  it('answers null when neither an upload nor the server file exists', async () => {
    const storage = storageAnswering(() =>
      Promise.reject(new Error('storage_object_missing')),
    );

    await expect(
      readTransferQr(storage, join(fallbackDirectory, 'absent.png')),
    ).resolves.toBeNull();
  });
});
