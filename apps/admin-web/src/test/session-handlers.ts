import { http } from "msw";
import { branchSuppliesHandler } from "./back-office-fixtures";
import { activeBranchesHandler } from "./booking-handlers";
import { apiUrl, jsonResponse, problemResponse } from "./msw";
import { pendingBadgeHandler } from "./payment-fixtures";
import { studioRulesHandler } from "./studio-settings-fixtures";

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
  role: "administrator" as const,
  branches: [],
};

// The browser holds a valid host-only session cookie (MSW cannot see it;
// the backend would answer these reads from it). Every shell page also
// reads the active Branches for the selector, and Horario (the landing page)
// reads an empty week unless a spec says otherwise; the Pagos badge reads no
// pending transfers and the Insumos badge a Branch without Supplies; the
// public studio rules (BKM-004) are today's.
export const signedInHandlers = () => [
  http.get(apiUrl(currentSessionPath), () => jsonResponse(paolaPrincipal)),
  http.get(apiUrl(staffProfilePath), () => jsonResponse(paolaProfile)),
  activeBranchesHandler(),
  http.get(apiUrl("/api/v1/administrator/sessions"), () => jsonResponse([])),
  pendingBadgeHandler(),
  branchSuppliesHandler(),
  studioRulesHandler(),
];

// IDN-009: Carolina Rivas, the Coordinator (ADR-0102). Her shell reads no
// money: no Pagos or Insumos badge handler, so such a read fails the spec.
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
  role: "coordinator" as const,
  branches: [],
};

export const coordinatorHandlers = () => [
  http.get(apiUrl(currentSessionPath), () => jsonResponse(carolinaPrincipal)),
  http.get(apiUrl(staffProfilePath), () => jsonResponse(carolinaProfile)),
  activeBranchesHandler(),
  http.get(apiUrl("/api/v1/administrator/sessions"), () => jsonResponse([])),
];

export const signedOutHandlers = () => [
  http.get(apiUrl(currentSessionPath), () =>
    problemResponse(401, "authentication_required"),
  ),
];
