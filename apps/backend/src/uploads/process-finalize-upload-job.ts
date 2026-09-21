import type { ImagePurpose } from './image-purpose';

type ImageAssetState =
  | 'pending'
  | 'processing'
  | 'ready'
  | 'attached'
  | 'failed'
  | 'deleted';

type ImageAssetForProcessing = {
  id: string;
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

type ProcessFinalizeUploadJobDependencies = {
  loadImageAsset(
    imageAssetId: string,
  ): Promise<ImageAssetForProcessing | null>;
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

export const processFinalizeUploadJob = async (
  job: { imageAssetId: string },
  dependencies: ProcessFinalizeUploadJobDependencies,
): Promise<'verified' | 'failed' | 'stale'> => {
  const asset = await dependencies.loadImageAsset(job.imageAssetId);

  if (asset === null || asset.state !== 'processing') {
    return 'stale';
  }

  let bytes: Buffer;
  try {
    bytes = await dependencies.readObject(asset.pendingObjectKey);
  } catch {
    await dependencies.markFailed({
      imageAssetId: asset.id,
      failureCode: 'image_object_missing',
    });
    return 'failed';
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
    return 'verified';
  } catch (error) {
    const failureCode =
      error instanceof Error ? error.message : 'image_verification_failed';
    await dependencies.markFailed({ imageAssetId: asset.id, failureCode });
    return 'failed';
  }
};
