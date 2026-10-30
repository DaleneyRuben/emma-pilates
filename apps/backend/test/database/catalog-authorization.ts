import type { MatrixRow } from './authorization-matrix';

const both = (access: 'allow' | 'deny'): MatrixRow => ({
  administrator: access,
  coordinator: access,
});

const administratorOnly = (): MatrixRow => ({
  administrator: 'allow',
  coordinator: 'deny',
});

// The schedule reads Branches and Class Types. Changing the catalog, and the
// Plan list with its prices, stay the Administrator's. Decision 6 lets the
// Coordinator assign a Trainer's Branches; inviting and Roles stay aside.
export const catalogAuthorizationRows = (): Record<string, MatrixRow> => ({
  'GET /api/v1/administrator/branches': both('allow'),
  'POST /api/v1/administrator/branches': administratorOnly(),
  'PUT /api/v1/administrator/branches/{branchId}': administratorOnly(),
  'POST /api/v1/administrator/branches/{branchId}/archive': administratorOnly(),
  'GET /api/v1/administrator/class-types': both('allow'),
  'POST /api/v1/administrator/class-types': administratorOnly(),
  'PUT /api/v1/administrator/class-types/{classTypeId}': administratorOnly(),
  'POST /api/v1/administrator/class-types/{classTypeId}/archive':
    administratorOnly(),
  // A real Trainer and no Branch: the Coordinator passes the Role check and
  // meets invalid_branch_assignment, so nothing changes.
  'PUT /api/v1/administrator/staff-members/{staffMemberId}/branches': {
    ...both('allow'),
    realIds: { staffMemberId: 'trainerStaffMemberId' },
    body: { branchIds: [] },
  },
});
