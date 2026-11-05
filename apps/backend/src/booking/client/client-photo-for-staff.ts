import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import type { ClientPhotoVariant } from './client-photo';

export type ClientPhotoAssetReader = {
  readPhotoObjectByAsset: (input: {
    imageAssetId: string;
    variant: ClientPhotoVariant;
  }) => Promise<{ objectKey: string; mediaType: string } | null>;
};

// Stub until finding n.º 30's staff read lands.
export const readClientPhotoForStaff: (
  query: { imageAssetId: string; variant: ClientPhotoVariant },
  principal: AuthenticatedPrincipal,
  dependencies: { reader: ClientPhotoAssetReader },
) => Promise<{ objectKey: string; mediaType: string }> = () =>
  Promise.reject(new Error('not implemented'));
