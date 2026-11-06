export type ImagePurpose =
  'profile_photo' | 'transfer_receipt' | 'promotion' | 'invoice';

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
  // FIX-044: the issued invoice, a PDF or a photo, as large as a receipt.
  invoice: { maxByteSize: 10 * 1024 * 1024, maxAxisPixels: 6_000 },
};

const imageMediaTypes = ['image/jpeg', 'image/png', 'image/webp'];
const acceptedMediaTypes: Readonly<Record<ImagePurpose, ReadonlySet<string>>> =
  {
    transfer_receipt: new Set(imageMediaTypes),
    profile_photo: new Set(imageMediaTypes),
    promotion: new Set(imageMediaTypes),
    invoice: new Set(['application/pdf', 'image/jpeg', 'image/png']),
  };

export const validateImageUploadDeclaration = (
  declaration: ImageUploadDeclaration,
): { maxAxisPixels: number } => {
  if (!acceptedMediaTypes[declaration.purpose].has(declaration.mediaType)) {
    throw new Error('image_media_type_invalid');
  }

  if (
    !Number.isSafeInteger(declaration.byteSize) ||
    declaration.byteSize <= 0
  ) {
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
