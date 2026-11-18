import type { MatrixRow } from './authorization-matrix';

const both = (extra: Partial<MatrixRow> = {}): MatrixRow => ({
  administrator: 'allow',
  coordinator: 'allow',
  ...extra,
});

// FIX-072: every Staff Member keeps her own payout QR from Perfil; only the
// Administrator, who pays salaries, reads anyone's. The probe's unknown
// upload and QR answer 409 or 404 after the Role passed.
export const payoutQrAuthorizationRows = (): Record<string, MatrixRow> => ({
  'GET /api/v1/staff-members/current/payout-qr': both(),
  'PUT /api/v1/staff-members/current/payout-qr': both({
    body: {
      imageAssetId: '00000000-0000-4000-8000-000000000000',
      validUntil: `${new Date().getUTCFullYear() + 1}-01-15`,
    },
  }),
  'GET /api/v1/staff-members/current/payout-qr/{payoutQrId}/image': both(),
  'GET /api/v1/administrator/staff-members/{staffMemberId}/payout-qr': {
    administrator: 'allow',
    coordinator: 'deny',
  },
  'GET /api/v1/administrator/payout-qrs/{payoutQrId}/image': {
    administrator: 'allow',
    coordinator: 'deny',
  },
});
