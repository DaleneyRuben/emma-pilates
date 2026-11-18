import type { MatrixRow } from './authorization-matrix';

const uuid = '00000000-0000-4000-8000-000000000000';

const both = (extra: Partial<MatrixRow> = {}): MatrixRow => ({
  administrator: 'allow',
  coordinator: 'allow',
  ...extra,
});
const administratorOnly = (extra: Partial<MatrixRow> = {}): MatrixRow => ({
  administrator: 'allow',
  coordinator: 'deny',
  ...extra,
});
const neither = (extra: Partial<MatrixRow> = {}): MatrixRow => ({
  administrator: 'deny',
  coordinator: 'deny',
  ...extra,
});

// BKO-004 / ADR-0106: Equipment is operational, not money. The Administrator
// and the Coordinator manage it and resolve faults; a Trainer reports a fault
// only from a Session she leads (trainer routes refuse both Roles here).
// FIX-067: the studio's Equipment Types are the Administrator's catalog; the
// Coordinator reads them and runs the units, the counts, and their damage.
export const equipmentAuthorizationRows = (): Record<string, MatrixRow> => ({
  'GET /api/v1/administrator/equipment': both({ query: `?branchId=${uuid}` }),
  'POST /api/v1/administrator/equipment': both({
    body: { branchId: uuid, kind: 'reformer', number: 1 },
  }),
  'POST /api/v1/administrator/equipment/{equipmentId}/archive': both(),
  'POST /api/v1/administrator/equipment/{equipmentId}/issues': both({
    body: { description: 'mmmmmmmm', outOfService: true },
  }),
  'GET /api/v1/administrator/equipment-issues': both({
    query: `?branchId=${uuid}`,
  }),
  'POST /api/v1/administrator/equipment-issues/{issueId}/resolve': both(),
  'POST /api/v1/administrator/equipment-issues/{issueId}/write-off': both(),
  'GET /api/v1/administrator/equipment-flags': both({
    query: `?branchId=${uuid}&from=2030-01-07T15:00:00.000Z&until=2030-01-14T15:00:00.000Z`,
  }),
  'GET /api/v1/administrator/equipment-types': both(),
  'POST /api/v1/administrator/equipment-types': administratorOnly({
    body: { name: 'mmmmmmmm', tracking: 'unit' },
  }),
  'PATCH /api/v1/administrator/equipment-types/{typeId}': administratorOnly({
    body: { name: 'mmmmmmmm' },
  }),
  'POST /api/v1/administrator/equipment-types/{typeId}/archive':
    administratorOnly(),
  'GET /api/v1/administrator/equipment-stocks': both({
    query: `?branchId=${uuid}`,
  }),
  'PUT /api/v1/administrator/equipment-stocks': both({
    body: { branchId: uuid, typeId: uuid, quantity: 1 },
  }),
  'POST /api/v1/administrator/equipment-stocks/damage': both({
    body: { branchId: uuid, typeId: uuid, quantity: 1, description: 'mmmm' },
  }),
  'GET /api/v1/trainer/sessions/{sessionId}/equipment': neither(),
  'POST /api/v1/trainer/sessions/{sessionId}/equipment-issues': neither({
    body: {
      equipmentId: uuid,
      description: 'mmmmmmmm',
      outOfService: true,
    },
  }),
});
