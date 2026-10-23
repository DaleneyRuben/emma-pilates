import { http } from "msw";
import { page } from "./booking-handlers";
import {
  categoriesHandler,
  expensePage,
  expensesPath,
} from "./expense-fixtures";
import { apiUrl, jsonResponse } from "./msw";
import {
  evaluationPage,
  evaluationsPath,
  referralPage,
  referralsPath,
} from "./oversight-fixtures";
import { clientPage, clientsPath, staffMembersPath } from "./people-fixtures";
import { promotionList } from "./promotion-fixtures";

// A spec that lands on or walks to a page for the shell's sake (the sidebar
// marker, the session guard, the Branch selector, a badge) answers that
// page's own reads with empty lists, so none goes unhandled while the test
// still runs (WEB-018). A page's behaviour is its own spec's business, with
// handlers of its own registered after these.
export const emptyPageHandlers = () => [
  promotionList([]),
  http.get(apiUrl(expensesPath), () => jsonResponse(expensePage([]))),
  categoriesHandler(() => []),
  http.get(apiUrl(clientsPath), () => jsonResponse(clientPage([]))),
  http.get(apiUrl("/api/v1/administrator/contact-alerts"), () =>
    jsonResponse({ items: [], totalItems: 0 }),
  ),
  http.get(apiUrl(referralsPath), () => jsonResponse(referralPage([]))),
  http.get(apiUrl(evaluationsPath), () => jsonResponse(evaluationPage([]))),
  http.get(apiUrl(staffMembersPath), () => jsonResponse(page([]))),
];
