import {
  validateImageUploadDeclaration,
} from './image-purpose';

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
});
