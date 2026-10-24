import type { MatrixRow } from './authorization-matrix';

// STU-001: recomputing facts is the Administrator's. The month has to parse,
// or the Role check never runs. The route takes a bearer credential.
export const studioFactsAuthorizationRows = (): Record<string, MatrixRow> => ({
  'POST /api/v1/administrator/studio-facts/recompute': {
    administrator: 'allow',
    coordinator: 'deny',
    body: { month: '2026-10' },
    bearer: true,
  },
  // STU-002: accrued revenue is money. The month has to parse, or the Role
  // check never runs. The report takes a bearer credential.
  'GET /api/v1/administrator/reports/revenue': {
    administrator: 'allow',
    coordinator: 'deny',
    query: '?month=2026-10',
    bearer: true,
  },
});
