import type { MatrixRow } from './authorization-matrix';

// WEB-038: where clients send money is the Administrator's alone, so the
// Coordinator is refused both the date and the upload (ADR-0108). The probe's
// four PNG bytes do not decode, so the Administrator's upload answers 400
// after her Role passed.
export const transferQrAuthorizationRows = (): Record<string, MatrixRow> => ({
  'GET /api/v1/administrator/transfer-qr': {
    administrator: 'allow',
    coordinator: 'deny',
  },
  'PUT /api/v1/administrator/transfer-qr': {
    administrator: 'allow',
    coordinator: 'deny',
    rawBody: true,
  },
});
