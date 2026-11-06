import type { MatrixRow } from './authorization-matrix';

const allow = (extra: Partial<MatrixRow> = {}): MatrixRow => ({
  administrator: 'allow',
  coordinator: 'allow',
  ...extra,
});
const photoBody = { imageAssetId: '00000000-0000-4000-8000-000000000000' };

// FIX-041 (decision §20.23): every Staff Member sets her own photo from
// Perfil; the Administrator and the Coordinator set anyone's from Personal;
// every signed-in Account reads a staff photo by asset. The probe's unknown
// upload, member, and asset answer 409 or 404 after the Role passed.
export const staffPhotoAuthorizationRows = (): Record<string, MatrixRow> => ({
  'PUT /api/v1/staff-members/current/photo': allow({ body: photoBody }),
  'DELETE /api/v1/staff-members/current/photo': allow(),
  'PUT /api/v1/administrator/staff-members/{staffMemberId}/photo': allow({
    body: photoBody,
  }),
  'DELETE /api/v1/administrator/staff-members/{staffMemberId}/photo': allow(),
  'GET /api/v1/staff-photos/{imageAssetId}': allow(),
  // Finding n.º 30: any Staff Role reads a Client photo by asset.
  'GET /api/v1/client-photos/{imageAssetId}': allow(),
});
