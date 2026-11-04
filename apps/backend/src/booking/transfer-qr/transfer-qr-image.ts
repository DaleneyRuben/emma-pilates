import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import type { ObjectStorage } from '../../uploads/object-storage';
import { isStorageObjectMissing } from '../../uploads/storage-object-missing';

// WEB-038: the studio's one transfer QR, replaced in place on every upload.
export const transferQrStorageKey = 'studio/transfer-qr';
export const maxTransferQrBytes = 5 * 1024 * 1024;
export const maxTransferQrAxisPixels = 4096;
export const transferQrMediaTypes: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

export type TransferQrErrorCode =
  'transfer_qr_invalid_image' | 'transfer_qr_too_large';

export class TransferQrError extends Error {
  constructor(readonly code: TransferQrErrorCode) {
    super(code);
    this.name = 'TransferQrError';
  }
}

export type NormalizedTransferQr = {
  png: Buffer;
  byteSize: number;
  width: number;
  height: number;
  sha256: string;
};

const acceptedFormats = new Set(['jpeg', 'png', 'webp']);

// Re-encoded as PNG so the apps' route keeps answering image/png; rotating by
// the EXIF orientation and re-encoding drops every other piece of metadata.
export const normalizeTransferQr = async (
  bytes: Buffer,
): Promise<NormalizedTransferQr> => {
  if (bytes.byteLength > maxTransferQrBytes) {
    throw new TransferQrError('transfer_qr_too_large');
  }

  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(bytes).metadata();
  } catch {
    throw new TransferQrError('transfer_qr_invalid_image');
  }
  if (
    metadata.format === undefined ||
    !acceptedFormats.has(metadata.format) ||
    !metadata.width ||
    !metadata.height
  ) {
    throw new TransferQrError('transfer_qr_invalid_image');
  }
  if (Math.max(metadata.width, metadata.height) > maxTransferQrAxisPixels) {
    throw new TransferQrError('transfer_qr_too_large');
  }

  let encoded: { data: Buffer; info: sharp.OutputInfo };
  try {
    encoded = await sharp(bytes)
      .rotate()
      .png()
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new TransferQrError('transfer_qr_invalid_image');
  }
  return {
    png: encoded.data,
    byteSize: encoded.data.byteLength,
    width: encoded.info.width,
    height: encoded.info.height,
    sha256: createHash('sha256').update(encoded.data).digest('hex'),
  };
};

// The uploaded QR, or the server's TRANSFER_QR_IMAGE_PATH file until the
// Administrator uploads one. Only a missing object falls back: the QR decides
// where clients send money, so an outage must fail instead of serving an old
// one.
export const readTransferQr = async (
  storage: ObjectStorage,
  fallbackPath: string,
): Promise<Buffer> => {
  try {
    return await storage.get(transferQrStorageKey);
  } catch (error) {
    if (!isStorageObjectMissing(error)) throw error;
    return readFile(fallbackPath);
  }
};
