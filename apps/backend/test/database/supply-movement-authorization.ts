import type { MatrixRow } from './authorization-matrix';

const both = (): MatrixRow => ({
  administrator: 'allow',
  coordinator: 'allow',
});

// Kept beside the matrix so that file stays within the line limit. The
// Coordinator runs Insumos: she records Withdrawals and Restocks (ADR-0108).
export const supplyMovementAuthorizationRows = (): Record<
  string,
  MatrixRow
> => ({
  'POST /api/v1/administrator/supplies/{supplyId}/withdrawals': both(),
  'POST /api/v1/administrator/supplies/{supplyId}/restocks': both(),
});
