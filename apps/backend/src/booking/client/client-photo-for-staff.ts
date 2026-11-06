import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BookingAccessDeniedError } from '../commands/create-booking';
import { ClientPhotoError, type ClientPhotoVariant } from './client-photo';

export type ClientPhotoAssetReader = {
  readPhotoObjectByAsset: (input: {
    imageAssetId: string;
    variant: ClientPhotoVariant;
  }) => Promise<{ objectKey: string; mediaType: string } | null>;
};

// Finding n.º 30 (owner, 2026-11-05): wherever the staff see a Client (a
// roster, Pagos pendientes, the client file), they see her photo. Any Staff
// Role may read it by the asset a read model names; a Client never reads
// another Client's photo, and reading is not audited, like her own route.
export const readClientPhotoForStaff = async (
  query: { imageAssetId: string; variant: ClientPhotoVariant },
  principal: AuthenticatedPrincipal,
  dependencies: { reader: ClientPhotoAssetReader },
): Promise<{ objectKey: string; mediaType: string }> => {
  if (principal.identity.kind !== 'staff') {
    throw new BookingAccessDeniedError();
  }
  const object = await dependencies.reader.readPhotoObjectByAsset(query);
  if (object === null) throw new ClientPhotoError('profile_photo_not_found');
  return object;
};
