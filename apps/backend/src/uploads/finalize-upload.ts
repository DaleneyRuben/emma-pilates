export class UploadAccessDeniedError extends Error {
  constructor() {
    super('Upload access is denied');
  }
}

type ImageAssetState =
  'pending' | 'processing' | 'ready' | 'attached' | 'failed' | 'deleted';

type ImageAssetForFinalization = {
  id: string;
  ownerAccountId: string;
  state: ImageAssetState;
};

type FinalizeUploadDependencies = {
  ownerAccountId: string;
  loadImageAsset(
    imageAssetId: string,
  ): Promise<ImageAssetForFinalization | null>;
  beginProcessing(imageAssetId: string): Promise<void>;
  enqueueFinalization(imageAssetId: string): Promise<void>;
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
  await dependencies.enqueueFinalization(asset.id);
};
