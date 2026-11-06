import { http } from "msw";
import { branchSuppliesHandler } from "./back-office-fixtures";
import { clientFileHandlers } from "./client-file-handlers";
import { activeBranchesHandler } from "./booking-handlers";
import { coordinatorHomeHandlers, homeHandlers } from "./home-handlers";
import { apiUrl, jsonResponse, problemResponse } from "./msw";
import { pendingBadgeHandler } from "./payment-fixtures";
import { emptyRosterHandler } from "./roster-fixtures";
import {
  studioRulesHandler,
  studioSettings,
  studioSettingsHandler,
} from "./studio-settings-fixtures";

export const currentSessionPath =
  "/api/v1/admin-web/authentication-sessions/current";
export const staffProfilePath = "/api/v1/staff-members/current";

export const paolaPrincipal = {
  accountId: "9e5b8d16-d57c-5bce-bcad-3262395e6892",
  identity: {
    kind: "staff" as const,
    staffMemberId: "7cde0ef6-5eb1-568d-ace7-938c98ee0a7e",
    role: "administrator" as const,
    branchIds: [],
  },
};

export const paolaProfile = {
  id: "7cde0ef6-5eb1-568d-ace7-938c98ee0a7e",
  name: "Paola Mendoza",
  email: "paola.mendoza@example.com",
  phone: null,
  photo: null,
  role: "administrator" as const,
  branches: [],
};

// The browser holds a valid host-only session cookie (MSW cannot see it;
// the backend would answer these reads from it). Every shell page also
// reads the active Branches for the selector, and Horario (the landing page)
// reads an empty week (and no equipment flags) unless a spec says otherwise; the Pagos badge reads no
// pending transfers and the Insumos badge a Branch without Supplies; the
// public studio rules and the Studio Settings (BKM-004) are today's; a
// Client file's tabs are empty.
export const signedInHandlers = () => [
  http.get(apiUrl(currentSessionPath), () => jsonResponse(paolaPrincipal)),
  http.get(apiUrl(staffProfilePath), () => jsonResponse(paolaProfile)),
  activeBranchesHandler(),
  http.get(apiUrl("/api/v1/administrator/sessions"), () => jsonResponse([])),
  emptyRosterHandler(),
  http.get(apiUrl("/api/v1/administrator/equipment-flags"), () =>
    jsonResponse([]),
  ),
  pendingBadgeHandler(),
  branchSuppliesHandler(),
  http.get(apiUrl("/api/v1/administrator/contact-alerts"), () =>
    jsonResponse({ items: [], totalItems: 0 }),
  ),
  studioRulesHandler(),
  studioSettingsHandler(),
  ...homeHandlers(),
  ...clientFileHandlers({ payments: true }),
];

// IDN-009: Carolina Rivas, the Coordinator (ADR-0102, ADR-0108). Her shell
// reads no money: no Pagos badge handler, so such a read fails the spec. She
// runs Insumos, so the low-stock count answers her.
export const carolinaPrincipal = {
  accountId: "4a7b0c1e-2f3d-5a6b-8c9d-0e1f2a3b4c5d",
  identity: {
    kind: "staff" as const,
    staffMemberId: "5b8c1d2f-3a4e-5b6c-9d0e-1f2a3b4c5d6e",
    role: "coordinator" as const,
    branchIds: [],
  },
};

export const carolinaProfile = {
  id: "5b8c1d2f-3a4e-5b6c-9d0e-1f2a3b4c5d6e",
  name: "Carolina Rivas",
  email: "carolina.rivas@example.com",
  phone: null,
  photo: null,
  role: "coordinator" as const,
  branches: [],
};

export const coordinatorHandlers = () => [
  http.get(apiUrl(currentSessionPath), () => jsonResponse(carolinaPrincipal)),
  http.get(apiUrl(staffProfilePath), () => jsonResponse(carolinaProfile)),
  activeBranchesHandler(),
  http.get(apiUrl("/api/v1/administrator/sessions"), () => jsonResponse([])),
  emptyRosterHandler(),
  http.get(apiUrl("/api/v1/administrator/contact-alerts"), () =>
    jsonResponse({ items: [], totalItems: 0 }),
  ),
  http.get(apiUrl("/api/v1/administrator/equipment-flags"), () =>
    jsonResponse([]),
  ),
  branchSuppliesHandler(),
  studioSettingsHandler({
    ...studioSettings,
    evaluationPriceCentavos: null,
    nutritionistFeeCentavos: null,
  }),
  ...coordinatorHomeHandlers(),
  // She never reads a Payment, so a sales read fails her spec.
  ...clientFileHandlers({ payments: false }),
];

export const signedOutHandlers = () => [
  http.get(apiUrl(currentSessionPath), () =>
    problemResponse(401, "authentication_required"),
  ),
];
