import {
  validateImageUploadDeclaration,
  type ImagePurpose,
} from './image-purpose';

type CreatePendingUploadCommand = {
  ownerAccountId: string;
  purpose: ImagePurpose;
  mediaType: string;
  byteSize: number;
  checksum: Uint8Array;
};

type PendingUpload = {
  id: string;
  pendingObjectKey: string;
  expiresAt: Date;
};

type CreatePendingUploadDependencies = {
  now(): Date;
  generateObjectKey(purpose: ImagePurpose): string;
  save(input: {
    ownerAccountId: string;
    purpose: ImagePurpose;
    pendingObjectKey: string;
    declaredMediaType: string;
    declaredByteSize: number;
    declaredChecksum: Uint8Array;
    createdAt: Date;
    expiresAt: Date;
    deletionDueAt: Date;
  }): Promise<{ id: string }>;
};

const uploadUrlLifetimeMs = 15 * 60 * 1_000;
// ADR-0089: one window for the app's sweep and R2's `pending/` lifecycle rule.
const abandonedUploadCleanupMs = 3 * 24 * 60 * 60 * 1_000;

export const createPendingUpload = async (
  command: CreatePendingUploadCommand,
  dependencies: CreatePendingUploadDependencies,
): Promise<PendingUpload> => {
  validateImageUploadDeclaration({
    purpose: command.purpose,
    mediaType: command.mediaType,
    byteSize: command.byteSize,
    checksum: command.checksum,
  });

  const pendingObjectKey = dependencies.generateObjectKey(command.purpose);
  const createdAt = dependencies.now();
  const expiresAt = new Date(createdAt.getTime() + uploadUrlLifetimeMs);
  const deletionDueAt = new Date(
    createdAt.getTime() + abandonedUploadCleanupMs,
  );

  const { id } = await dependencies.save({
    ownerAccountId: command.ownerAccountId,
    purpose: command.purpose,
    pendingObjectKey,
    declaredMediaType: command.mediaType,
    declaredByteSize: command.byteSize,
    declaredChecksum: command.checksum,
    createdAt,
    expiresAt,
    deletionDueAt,
  });

  return { id, pendingObjectKey, expiresAt };
};
