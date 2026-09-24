import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { ImageAssetNotAttachableError } from '../../uploads/image-asset-attachments';
import { BookingAccessDeniedError } from '../commands/create-booking';
import type { ClientProfile } from './client-profile';

// Client 22's «Cambiar foto» / «Quitar foto» over the `profile_photo` uploads
// UPL-001 verifies and UPL-002 rebuilds (ADR-0073); a replaced or removed
// photo releases its variants at once (ADR-0076).
export type ClientPhotoVariant = 'display' | 'thumbnail';
export const clientPhotoVariants: readonly ClientPhotoVariant[] = [
  'display',
  'thumbnail',
];

export type ClientPhotoErrorCode =
  'profile_photo_not_ready' | 'profile_photo_not_found';

const statuses: Record<ClientPhotoErrorCode, number> = {
  profile_photo_not_ready: 409,
  profile_photo_not_found: 404,
};

export class ClientPhotoError extends Error {
  readonly status: number;

  constructor(readonly code: ClientPhotoErrorCode) {
    super(code);
    this.name = 'ClientPhotoError';
    this.status = statuses[code];
  }
}

export type ClientPhotoGateway = {
  // Attaches the new upload before releasing the previous photo (ADR-0076).
  replacePhoto: (input: {
    clientId: string;
    ownerAccountId: string;
    imageAssetId: string;
    now: Date;
  }) => Promise<ClientProfile>;
  removePhoto: (input: { clientId: string; now: Date }) => Promise<void>;
  readPhotoObject: (input: {
    clientId: string;
    variant: ClientPhotoVariant;
  }) => Promise<{ objectKey: string; mediaType: string } | null>;
};

const requireClient = (principal: AuthenticatedPrincipal): string => {
  if (principal.identity.kind !== 'client') {
    throw new BookingAccessDeniedError();
  }
  return principal.identity.clientId;
};

export const setClientPhoto = async (
  command: { imageAssetId: string },
  principal: AuthenticatedPrincipal,
  dependencies: { gateway: ClientPhotoGateway; now: () => Date },
): Promise<ClientProfile> => {
  const clientId = requireClient(principal);
  try {
    return await dependencies.gateway.replacePhoto({
      clientId,
      ownerAccountId: principal.accountId,
      imageAssetId: command.imageAssetId,
      now: dependencies.now(),
    });
  } catch (error) {
    if (error instanceof ImageAssetNotAttachableError) {
      throw new ClientPhotoError('profile_photo_not_ready');
    }
    throw error;
  }
};

export const removeClientPhoto = async (
  principal: AuthenticatedPrincipal,
  dependencies: { gateway: ClientPhotoGateway; now: () => Date },
): Promise<void> => {
  const clientId = requireClient(principal);
  await dependencies.gateway.removePhoto({ clientId, now: dependencies.now() });
};

export const readClientPhoto = async (
  query: { variant: ClientPhotoVariant },
  principal: AuthenticatedPrincipal,
  dependencies: { gateway: ClientPhotoGateway },
): Promise<{ objectKey: string; mediaType: string }> => {
  const clientId = requireClient(principal);
  const object = await dependencies.gateway.readPhotoObject({
    clientId,
    variant: query.variant,
  });
  if (object === null) throw new ClientPhotoError('profile_photo_not_found');
  return object;
};
