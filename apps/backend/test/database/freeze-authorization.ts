import type { MatrixRow } from './authorization-matrix';

const administratorOnly = (extra: Partial<MatrixRow> = {}): MatrixRow => ({
  administrator: 'allow',
  coordinator: 'deny',
  ...extra,
});

const bothDenied = (): Pick<MatrixRow, 'administrator' | 'coordinator'> => ({
  administrator: 'deny',
  coordinator: 'deny',
});

// BKM-012: the Client owns the request, so both Roles are refused alike
// (owner-scoped). The decision is the Administrator's. A body the DTO
// accepts is required, or validation answers 400 before the Role check.
export const freezeAuthorizationRows = (): Record<string, MatrixRow> => ({
  'POST /api/v1/freezes': {
    ...bothDenied(),
    ownerScoped: true,
    body: {
      subscriptionId: '00000000-0000-4000-8000-000000000000',
      startsOn: '2026-11-01',
      endsOn: '2026-11-10',
      reason: 'Viaje',
    },
  },
  // These handlers read the bearer credential, not the admin-web cookie.
  'GET /api/v1/administrator/freezes': administratorOnly({ bearer: true }),
  'GET /api/v1/administrator/freezes/{freezeId}': administratorOnly({
    bearer: true,
    realIds: { freezeId: 'freezeId' },
  }),
  // A real Freeze reaches the Role check. A missing id was 403 for both
  // Roles before that check ran, so the probe never saw the decision.
  'POST /api/v1/administrator/freezes/{freezeId}/decision': {
    administrator: 'allow',
    coordinator: 'deny',
    bearer: true,
    realIds: { freezeId: 'freezeId' },
    body: { decision: 'refused' },
  },
});
