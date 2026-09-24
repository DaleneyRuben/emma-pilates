import type { ImagePurpose } from './image-purpose';
import type { BuiltImageVariant, ImageVariantKind } from './image-variants';

type ImageAssetState =
  'pending' | 'processing' | 'ready' | 'attached' | 'failed' | 'deleted';

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

export type StoredImageVariant = {
  kind: ImageVariantKind;
  storageKey: string;
  mediaType: string;
  byteSize: number;
  width: number;
  height: number;
};

export type ProcessFinalizeUploadJobDependencies = {
  loadImageAsset(imageAssetId: string): Promise<ImageAssetForProcessing | null>;
  readObject(objectKey: string): Promise<Buffer>;
  verifyBytes(
    bytes: Buffer,
    declared: { mediaType: string; byteSize: number; checksum: Uint8Array },
    purpose: ImagePurpose,
  ): Promise<VerifiedImage>;
  buildVariants(
    bytes: Buffer,
    purpose: ImagePurpose,
  ): Promise<BuiltImageVariant[]>;
  storeVariant(storageKey: string, bytes: Buffer): Promise<void>;
  markVerified(input: {
    imageAssetId: string;
    verified: VerifiedImage;
    variants: StoredImageVariant[];
  }): Promise<void>;
  markFailed(input: {
    imageAssetId: string;
    failureCode: string;
  }): Promise<void>;
  deleteObject(objectKey: string): Promise<void>;
};

// Private variants keep one deterministic key per asset and kind, so a retried
// job overwrites its own partial output instead of leaving orphans.
export const privateVariantKey = (
  purpose: ImagePurpose,
  imageAssetId: string,
  kind: ImageVariantKind,
): string => `private/${purpose}/${imageAssetId}/${kind}`;

const failureCodeOf = (error: unknown, fallback: string): string =>
  error instanceof Error && /^[a-z_]+$/.test(error.message)
    ? error.message
    : fallback;

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

  let verified: VerifiedImage;
  let built: BuiltImageVariant[];
  try {
    verified = await dependencies.verifyBytes(
      bytes,
      {
        mediaType: asset.declaredMediaType,
        byteSize: asset.declaredByteSize,
        checksum: asset.declaredChecksum,
      },
      asset.purpose,
    );
    built = await dependencies.buildVariants(bytes, asset.purpose);
  } catch (error) {
    await dependencies.markFailed({
      imageAssetId: asset.id,
      failureCode: failureCodeOf(error, 'image_verification_failed'),
    });
    return 'failed';
  }

  // Storage and database failures throw so pg-boss retries the whole job.
  const variants: StoredImageVariant[] = [];
  for (const variant of built) {
    const storageKey = privateVariantKey(asset.purpose, asset.id, variant.kind);
    await dependencies.storeVariant(storageKey, variant.bytes);
    variants.push({
      kind: variant.kind,
      storageKey,
      mediaType: variant.mediaType,
      byteSize: variant.byteSize,
      width: variant.width,
      height: variant.height,
    });
  }
  await dependencies.markVerified({
    imageAssetId: asset.id,
    verified,
    variants,
  });
  await dependencies.deleteObject(asset.pendingObjectKey);
  return 'verified';
};
