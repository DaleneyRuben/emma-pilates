import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { verifyImageBytes } from './verify-image-bytes';

const pngBuffer = (width: number, height: number): Promise<Buffer> =>
  sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 200, g: 30, b: 30 },
    },
  })
    .png()
    .toBuffer();

const checksumOf = (bytes: Buffer): Buffer =>
  createHash('sha256').update(bytes).digest();

describe('verifyImageBytes', () => {
  it('returns detected media type and dimensions for bytes matching the declaration', async () => {
    const bytes = await pngBuffer(10, 6);

    await expect(
      verifyImageBytes(
        bytes,
        {
          mediaType: 'image/png',
          byteSize: bytes.byteLength,
          checksum: checksumOf(bytes),
        },
        100,
      ),
    ).resolves.toEqual({
      mediaType: 'image/png',
      byteSize: bytes.byteLength,
      checksum: checksumOf(bytes),
      width: 10,
      height: 6,
    });
  });

  it('rejects bytes whose checksum does not match the declared checksum', async () => {
    const bytes = await pngBuffer(10, 6);

    await expect(
      verifyImageBytes(
        bytes,
        {
          mediaType: 'image/png',
          byteSize: bytes.byteLength,
          checksum: new Uint8Array(32),
        },
        100,
      ),
    ).rejects.toThrow('image_checksum_mismatch');
  });

  it('rejects a declared byte size that does not match the actual bytes', async () => {
    const bytes = await pngBuffer(10, 6);

    await expect(
      verifyImageBytes(
        bytes,
        {
          mediaType: 'image/png',
          byteSize: bytes.byteLength + 1,
          checksum: checksumOf(bytes),
        },
        100,
      ),
    ).rejects.toThrow('image_size_mismatch');
  });

  it('rejects a decoded format that does not match the declared media type', async () => {
    const bytes = await pngBuffer(10, 6);

    await expect(
      verifyImageBytes(
        bytes,
        {
          mediaType: 'image/jpeg',
          byteSize: bytes.byteLength,
          checksum: checksumOf(bytes),
        },
        100,
      ),
    ).rejects.toThrow('image_media_type_mismatch');
  });

  it('rejects dimensions larger than the caller-provided maximum axis', async () => {
    const bytes = await pngBuffer(50, 50);

    await expect(
      verifyImageBytes(
        bytes,
        {
          mediaType: 'image/png',
          byteSize: bytes.byteLength,
          checksum: checksumOf(bytes),
        },
        10,
      ),
    ).rejects.toThrow('image_dimensions_too_large');
  });

  it('rejects bytes that cannot be decoded as an image', async () => {
    const bytes = Buffer.from('not an image');

    await expect(
      verifyImageBytes(
        bytes,
        {
          mediaType: 'image/png',
          byteSize: bytes.byteLength,
          checksum: checksumOf(bytes),
        },
        100,
      ),
    ).rejects.toThrow('image_decode_failed');
  });
});
