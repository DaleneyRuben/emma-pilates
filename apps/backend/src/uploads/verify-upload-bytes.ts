import type { ImagePurpose } from './image-purpose';

type DeclaredUpload = {
  mediaType: string;
  byteSize: number;
  checksum: Uint8Array;
};

type VerifiedUpload = {
  mediaType: string;
  byteSize: number;
  checksum: Uint8Array;
  width: number;
  height: number;
};

export const verifyUploadBytes: (
  bytes: Buffer,
  declared: DeclaredUpload,
  purpose: ImagePurpose,
) => Promise<VerifiedUpload> = () =>
  Promise.reject(new Error('not implemented'));
