import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { evaluationSearchSchema } from "../oversight/evaluations/evaluation-search";
import { nameSearchSchema } from "../oversight/oversight-search";
import { authenticatedRoute } from "./root-routes";

// The read-only oversight lists (WEB-008): AW25–AW27, and the Promotions
// carousel (WEB-006): AW17, one chunk each.
const evaluationsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/back-office/evaluaciones-nutricionales",
  validateSearch: evaluationSearchSchema,
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

const referralsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/promociones/referidos",
  validateSearch: nameSearchSchema,
  component: lazyRouteComponent(
    () => import("../oversight/referrals/referrals-route"),
    "ReferralsRoute",
  ),
});

const creditsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/promociones/creditos",
  validateSearch: nameSearchSchema,
  component: lazyRouteComponent(
    () => import("../oversight/credits/credits-route"),
    "CreditsRoute",
  ),
});

export const oversightRoutes = [
  evaluationsRoute,
  promotionsRoute,
  referralsRoute,
  creditsRoute,
];
