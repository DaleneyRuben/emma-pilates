import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { evaluationSearchSchema } from "../oversight/evaluations/evaluation-search";
import { nameSearchSchema } from "../oversight/oversight-search";
import { clientSearchSchema } from "../people/people-search";
import { optionalSearch } from "../components/table/pagination";
import { authenticatedRoute } from "./root-routes";

// The read-only oversight lists (WEB-008): AW25–AW27, and the Promotions
// carousel (WEB-006): AW17, one chunk each.
const evaluationsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/back-office/evaluaciones-nutricionales",
  validateSearch: optionalSearch(evaluationSearchSchema),
  component: lazyRouteComponent(
    () => import("../oversight/evaluations/evaluations-route"),
    "EvaluationsRoute",
  ),
});

const promotionsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/promociones",
  component: lazyRouteComponent(
    () => import("../promotions/promotions-route"),
    "PromotionsRoute",
  ),
});

// AW35 (BE-022) belongs to Promociones and has no sidebar entry; its search
// is AW21's (name, email, or phone).
const promotionContactsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/promociones/contactos",
  validateSearch: optionalSearch(clientSearchSchema),
  component: lazyRouteComponent(
    () => import("../promotions/contacts/contacts-route"),
    "ContactsRoute",
  ),
});

const referralsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/promociones/referidos",
  validateSearch: optionalSearch(nameSearchSchema),
  component: lazyRouteComponent(
    () => import("../oversight/referrals/referrals-route"),
    "ReferralsRoute",
  ),
});

export const oversightRoutes = [
  evaluationsRoute,
  promotionsRoute,
  promotionContactsRoute,
  referralsRoute,
];
