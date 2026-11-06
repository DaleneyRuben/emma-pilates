import { validateImageUploadDeclaration } from './image-purpose';

describe('validateImageUploadDeclaration', () => {
  it('accepts a WebP transfer receipt at its approved limit', () => {
    expect(
      validateImageUploadDeclaration({
        purpose: 'transfer_receipt',
        mediaType: 'image/webp',
        byteSize: 10 * 1024 * 1024,
        checksum: new Uint8Array(32),
      }),
    ).toEqual({ maxAxisPixels: 6_000 });
  });

  it('rejects an oversized profile photo before issuing an upload URL', () => {
    expect(() =>
      validateImageUploadDeclaration({
        purpose: 'profile_photo',
        mediaType: 'image/jpeg',
        byteSize: 5 * 1024 * 1024 + 1,
        checksum: new Uint8Array(32),
      }),
    ).toThrow('image_too_large');
  });

  it('accepts a PDF invoice up to 10 MB', () => {
    expect(
      validateImageUploadDeclaration({
        purpose: 'invoice',
        mediaType: 'application/pdf',
        byteSize: 10 * 1024 * 1024,
        checksum: new Uint8Array(32),
      }),
    ).toEqual({ maxAxisPixels: 6_000 });
    expect(() =>
      validateImageUploadDeclaration({
        purpose: 'invoice',
        mediaType: 'application/pdf',
        byteSize: 10 * 1024 * 1024 + 1,
        checksum: new Uint8Array(32),
      }),
    ).toThrow('image_too_large');
  });

  it('accepts a JPEG or PNG invoice but no WebP', () => {
    for (const mediaType of ['image/jpeg', 'image/png']) {
      expect(() =>
        validateImageUploadDeclaration({
          purpose: 'invoice',
          mediaType,
          byteSize: 1_000,
          checksum: new Uint8Array(32),
        }),
      ).not.toThrow();
    }
    expect(() =>
      validateImageUploadDeclaration({
        purpose: 'invoice',
        mediaType: 'image/webp',
        byteSize: 1_000,
        checksum: new Uint8Array(32),
      }),
    ).toThrow('image_media_type_invalid');
  });

  it.each(['transfer_receipt', 'profile_photo', 'promotion'] as const)(
    'refuses a PDF for a %s',
    (purpose) => {
      expect(() =>
        validateImageUploadDeclaration({
          purpose,
          mediaType: 'application/pdf',
          byteSize: 1_000,
          checksum: new Uint8Array(32),
        }),
      ).toThrow('image_media_type_invalid');
    },
  );
});
