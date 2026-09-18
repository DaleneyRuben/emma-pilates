import { createHash } from 'node:crypto';
import sharp from 'sharp';

export type VerifiableMediaType = 'image/jpeg' | 'image/png' | 'image/webp';

type DeclaredImage = {
  mediaType: VerifiableMediaType;
  byteSize: number;
  checksum: Uint8Array;
};

type VerifiedImage = {
  mediaType: VerifiableMediaType;
  byteSize: number;
  checksum: Buffer;
  width: number;
  height: number;
};

const formatToMediaType: Partial<Record<string, VerifiableMediaType>> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export const verifyImageBytes = async (
  bytes: Buffer,
  declared: DeclaredImage,
  maxAxisPixels: number,
): Promise<VerifiedImage> => {
  if (bytes.byteLength !== declared.byteSize) {
    throw new Error('image_size_mismatch');
  }

  const checksum = createHash('sha256').update(bytes).digest();
  if (!checksum.equals(Buffer.from(declared.checksum))) {
    throw new Error('image_checksum_mismatch');
  }

  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(bytes).metadata();
  } catch {
    throw new Error('image_decode_failed');
  }

  const mediaType = metadata.format
    ? formatToMediaType[metadata.format]
    : undefined;
  if (mediaType === undefined) {
    throw new Error('image_decode_failed');
  }

  if (mediaType !== declared.mediaType) {
    throw new Error('image_media_type_mismatch');
  }

  const { width, height } = metadata;
  if (!width || !height) {
    throw new Error('image_decode_failed');
  }

  if (width > maxAxisPixels || height > maxAxisPixels) {
    throw new Error('image_dimensions_too_large');
  }

  return { mediaType, byteSize: bytes.byteLength, checksum, width, height };
};
