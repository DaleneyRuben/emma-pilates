import { UploadAccessDeniedError } from './finalize-upload';

type PendingUploadObjectState =
  | 'pending'
  | 'processing'
  | 'ready'
  | 'attached'
  | 'failed'
  | 'deleted';

type PendingUploadTarget = {
  ownerAccountId: string;
  pendingObjectKey: string;
  state: PendingUploadObjectState;
};

type PutPendingUploadObjectDependencies = {
  ownerAccountId: string;
  loadPendingObjectKey(
    imageAssetId: string,
  ): Promise<PendingUploadTarget | null>;
  writeObject(objectKey: string, bytes: Buffer): Promise<void>;
};

export const putPendingUploadObject = async (
  command: { imageAssetId: string; bytes: Buffer },
  dependencies: PutPendingUploadObjectDependencies,
): Promise<void> => {
  const target = await dependencies.loadPendingObjectKey(command.imageAssetId);

  if (target === null || target.ownerAccountId !== dependencies.ownerAccountId) {
    throw new UploadAccessDeniedError();
  }

  if (target.state !== 'pending') {
    throw new Error('Upload is not writable');
  }

  await dependencies.writeObject(target.pendingObjectKey, command.bytes);
};
