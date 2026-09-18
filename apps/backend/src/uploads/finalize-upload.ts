import type { ImagePurpose } from './image-purpose';

export class UploadAccessDeniedError extends Error {
  constructor() {
    super('Upload access is denied');
  }
}

type ImageAssetState =
  | 'pending'
  | 'processing'
  | 'ready'
  | 'attached'
  | 'failed'
  | 'deleted';

type ImageAssetForFinalization = {
  id: string;
  ownerAccountId: string;
  purpose: ImagePurpose;
  state: ImageAssetState;
  pendingObjectKey: string;
  declaredMediaType: string;
  declaredByteSize: number;
  declaredChecksum: Uint8Array;
};

type VerifiedImage = {
  mediaType: string;
  byteSize: number;
  checksum: Uint8Array;
  width: number;
  height: number;
};

type FinalizeUploadDependencies = {
  ownerAccountId: string;
  loadImageAsset(
    imageAssetId: string,
  ): Promise<ImageAssetForFinalization | null>;
  beginProcessing(imageAssetId: string): Promise<void>;
  readObject(objectKey: string): Promise<Buffer>;
  verifyBytes(
    bytes: Buffer,
    declared: { mediaType: string; byteSize: number; checksum: Uint8Array },
    purpose: ImagePurpose,
  ): Promise<VerifiedImage>;
  markVerified(input: {
    imageAssetId: string;
    verified: VerifiedImage;
  }): Promise<void>;
  markFailed(input: { imageAssetId: string; failureCode: string }): Promise<void>;
};

export const finalizeUpload = async (
  command: { imageAssetId: string },
  dependencies: FinalizeUploadDependencies,
): Promise<void> => {
  const asset = await dependencies.loadImageAsset(command.imageAssetId);

  if (asset === null || asset.ownerAccountId !== dependencies.ownerAccountId) {
    throw new UploadAccessDeniedError();
  }

  if (asset.state === 'processing') {
    return;
  }

  if (asset.state !== 'pending') {
    throw new Error('Upload is not finalizable');
  }

  await dependencies.beginProcessing(asset.id);

  let bytes: Buffer;
  try {
    bytes = await dependencies.readObject(asset.pendingObjectKey);
  } catch {
    await dependencies.markFailed({
      imageAssetId: asset.id,
      failureCode: 'image_object_missing',
    });
    return;
  }

  try {
    const verified = await dependencies.verifyBytes(
      bytes,
      {
        mediaType: asset.declaredMediaType,
        byteSize: asset.declaredByteSize,
        checksum: asset.declaredChecksum,
      },
      asset.purpose,
    );
    await dependencies.markVerified({ imageAssetId: asset.id, verified });
  } catch (error) {
    const failureCode =
      error instanceof Error ? error.message : 'image_verification_failed';
    await dependencies.markFailed({ imageAssetId: asset.id, failureCode });
  }
};
