import { http } from "msw";
import { activeBranchesHandler } from "./booking-handlers";
import { apiUrl, jsonResponse, problemResponse } from "./msw";
import { pendingBadgeHandler } from "./payment-fixtures";

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
// pending transfers.
export const signedInHandlers = () => [
  http.get(apiUrl(currentSessionPath), () => jsonResponse(paolaPrincipal)),
  http.get(apiUrl(staffProfilePath), () => jsonResponse(paolaProfile)),
  activeBranchesHandler(),
  http.get(apiUrl("/api/v1/administrator/sessions"), () => jsonResponse([])),
  pendingBadgeHandler(),
];

export const signedOutHandlers = () => [
  http.get(apiUrl(currentSessionPath), () =>
    problemResponse(401, "authentication_required"),
  ),
];
