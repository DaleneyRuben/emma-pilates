import type { MatrixRow } from './authorization-matrix';

const administratorOnly = (): MatrixRow => ({
  administrator: 'allow',
  coordinator: 'deny',
});

// Kept beside the matrix so that file stays within the line limit.
export const supplyMovementAuthorizationRows = (): Record<
  string,
  MatrixRow
> => ({
  'POST /api/v1/administrator/supplies/{supplyId}/withdrawals':
    administratorOnly(),
  'POST /api/v1/administrator/supplies/{supplyId}/restocks':
    administratorOnly(),
});
