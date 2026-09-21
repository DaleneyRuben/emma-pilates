export type ImagePurpose =
  | 'profile_photo'
  | 'transfer_receipt'
  | 'promotion';

type ImageUploadDeclaration = {
  purpose: ImagePurpose;
  mediaType: string;
  byteSize: number;
  checksum: Uint8Array;
};

const purposeLimits: Readonly<
  Record<ImagePurpose, { maxByteSize: number; maxAxisPixels: number }>
> = {
  transfer_receipt: { maxByteSize: 10 * 1024 * 1024, maxAxisPixels: 6_000 },
  profile_photo: { maxByteSize: 5 * 1024 * 1024, maxAxisPixels: 4_096 },
  promotion: { maxByteSize: 20 * 1024 * 1024, maxAxisPixels: 6_000 },
};

const acceptedMediaTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const validateImageUploadDeclaration = (
  declaration: ImageUploadDeclaration,
): { maxAxisPixels: number } => {
  if (!acceptedMediaTypes.has(declaration.mediaType)) {
    throw new Error('image_media_type_invalid');
  }

  if (!Number.isSafeInteger(declaration.byteSize) || declaration.byteSize <= 0) {
    throw new Error('image_size_invalid');
  }

  if (declaration.checksum.byteLength !== 32) {
    throw new Error('image_checksum_invalid');
  }

  const limits = purposeLimits[declaration.purpose];
  if (declaration.byteSize > limits.maxByteSize) {
    throw new Error('image_too_large');
  }

  return { maxAxisPixels: limits.maxAxisPixels };
};
