import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { verifyUploadBytes } from './verify-upload-bytes';

const checksumOf = (bytes: Buffer): Buffer =>
  createHash('sha256').update(bytes).digest();

describe('verifyUploadBytes', () => {
  it('checks a declared PDF invoice as a PDF', async () => {
    const bytes = Buffer.from('%PDF-1.4\n%%EOF\n');

    await expect(
      verifyUploadBytes(
        bytes,
        {
          mediaType: 'application/pdf',
          byteSize: bytes.byteLength,
          checksum: checksumOf(bytes),
        },
        'invoice',
      ),
    ).resolves.toMatchObject({ mediaType: 'application/pdf', width: 0 });
  });

  it('checks a declared photo as an image', async () => {
    const bytes = await sharp({
      create: { width: 8, height: 4, channels: 3, background: '#ffffff' },
    })
      .png()
      .toBuffer();

    await expect(
      verifyUploadBytes(
        bytes,
        {
          mediaType: 'image/png',
          byteSize: bytes.byteLength,
          checksum: checksumOf(bytes),
        },
        'invoice',
      ),
    ).resolves.toMatchObject({ mediaType: 'image/png', width: 8, height: 4 });
  });

  it('refuses image bytes declared as a PDF', async () => {
    const bytes = await sharp({
      create: { width: 8, height: 4, channels: 3, background: '#ffffff' },
    })
      .png()
      .toBuffer();

    await expect(
      verifyUploadBytes(
        bytes,
        {
          mediaType: 'application/pdf',
          byteSize: bytes.byteLength,
          checksum: checksumOf(bytes),
        },
        'invoice',
      ),
    ).rejects.toThrow('image_decode_failed');
  });

  it('refuses a PDF for any other purpose', async () => {
    const bytes = Buffer.from('%PDF-1.4\n%%EOF\n');

    await expect(
      verifyUploadBytes(
        bytes,
        {
          mediaType: 'application/pdf',
          byteSize: bytes.byteLength,
          checksum: checksumOf(bytes),
        },
        'transfer_receipt',
      ),
    ).rejects.toThrow('image_media_type_invalid');
  });
});
