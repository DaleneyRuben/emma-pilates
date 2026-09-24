import type { QueryClient } from "@tanstack/react-query";
import {
  createRoute,
  createRouter,
  lazyRouteComponent,
  type RouterHistory,
} from "@tanstack/react-router";
import type { SessionExpiry } from "../api/session-expiry";
import {
  catalogStatusSearchSchema,
  planSearchSchema,
} from "../catalog/catalog-search";
import { listSearchSchema } from "../components/table/pagination";
import { PlaceholderPage } from "../pages/placeholder-page";
import { scheduleSearchSchema } from "../schedule/schedule-search";
import { backOfficeRoutes } from "./back-office-routes";
import { navigationItems } from "./navigation";
import { oversightRoutes } from "./oversight-routes";
import { reportRoutes } from "./report-routes";
import { authenticatedRoute, publicRoutes, rootRoute } from "./root-routes";

// List pages validate their page-and-offset search and allowlisted filters
// (ADR-0061/0062) so the URL, not component state, owns them (ADR-0042).
// Every page is its own chunk (ADR-0023 route-level code splitting): the
// entry keeps the session guard, the shell, and the sign-in pages.
const scheduleRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/",
  validateSearch: scheduleSearchSchema,
  component: lazyRouteComponent(
    () => import("../schedule/schedule-route"),
    "ScheduleRoute",
  ),
});

const branchesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/catalogo/sucursales",
  validateSearch: catalogStatusSearchSchema,
  component: lazyRouteComponent(
    () => import("../catalog/branches/branches-route"),
    "BranchesRoute",
  ),
});

const classTypesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/catalogo/tipos-de-clase",
  validateSearch: catalogStatusSearchSchema,
  component: lazyRouteComponent(
    () => import("../catalog/class-types/class-types-route"),
    "ClassTypesRoute",
  ),
});

const plansRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/catalogo/planes",
  validateSearch: planSearchSchema,
  component: lazyRouteComponent(
    () => import("../catalog/plans/plans-route"),
    "PlansRoute",
  ),
});

const pageRoutes = [
  scheduleRoute,
  branchesRoute,
  classTypesRoute,
  plansRoute,
  ...backOfficeRoutes,
  ...oversightRoutes,
  ...reportRoutes,
];
const placeholderRoutes = navigationItems
  .filter((item) => item.built !== true)
  .map((item) =>
    item.list
      ? createRoute({
          getParentRoute: () => authenticatedRoute,
          path: item.to,
          validateSearch: listSearchSchema,
          component: () => <PlaceholderPage item={item} />,
        })
      : createRoute({
          getParentRoute: () => authenticatedRoute,
          path: item.to,
          component: () => <PlaceholderPage item={item} />,
        }),
  );

const routeTree = rootRoute.addChildren([
  ...publicRoutes,
  authenticatedRoute.addChildren([...pageRoutes, ...placeholderRoutes]),
]);

export function createAdminRouter(options: {
  history?: RouterHistory;
  queryClient: QueryClient;
  sessionExpiry: SessionExpiry;
}) {
  return createRouter({
    routeTree,
    history: options.history,
    context: {
      queryClient: options.queryClient,
      sessionExpiry: options.sessionExpiry,
    },
    defaultPreload: "intent",
    scrollRestoration: true,
  });
}

export type AdminRouter = ReturnType<typeof createAdminRouter>;

declare module "@tanstack/react-router" {
  interface Register {
    router: AdminRouter;
  }
}
