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
  // STU-003: both roles read the counts. The month has to parse, or the Role
  // check never runs. Amounts stay off the Coordinator payload.
  'GET /api/v1/administrator/reports/kpis': {
    administrator: 'allow',
    coordinator: 'allow',
    query: '?month=2026-10',
    bearer: true,
  },
  // STU-006: both roles read the findings. v1 has no money rule. The month
  // has to parse, or the Role check never runs.
  'GET /api/v1/administrator/recommendations': {
    administrator: 'allow',
    coordinator: 'allow',
    query: '?month=2026-10',
    bearer: true,
  },
  // Recompute and dismiss stay with the Administrator. A missing id is 404
  // after her Role passes; the Coordinator is refused before that lookup.
  'POST /api/v1/administrator/recommendations/recompute': {
    administrator: 'allow',
    coordinator: 'deny',
    body: { month: '2026-10' },
    bearer: true,
  },
  'POST /api/v1/administrator/recommendations/{id}/dismiss': {
    administrator: 'allow',
    coordinator: 'deny',
    bearer: true,
  },
});
