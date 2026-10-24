import type { MatrixRow } from './authorization-matrix';

const administratorOnly = (): Pick<
  MatrixRow,
  'administrator' | 'coordinator'
> => ({
  administrator: 'allow',
  coordinator: 'deny',
});

// BKM-015: a campaign grant is the Administrator's. The grant body is checked
// before the Role, so an empty sample would answer 400 and hide the 403.
// Kept beside the matrix because that file is already past the size limit.
export const campaignAuthorizationRows = (): Record<string, MatrixRow> => ({
  'GET /api/v1/administrator/campaigns/preview': administratorOnly(),
  'POST /api/v1/administrator/campaigns': {
    ...administratorOnly(),
    body: { name: 'Inicio de año', classes: 1 },
  },
});
