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
import { scheduleSearchSchema } from "../schedule/schedule-search";
import { backOfficeRoutes } from "./back-office-routes";
import { oversightRoutes } from "./oversight-routes";
import { reportRoutes } from "./report-routes";
import { optionalSearch } from "../components/table/pagination";
import { pagePendingOptions } from "./page-pending";
import { authenticatedRoute, publicRoutes, rootRoute } from "./root-routes";

// List pages validate their page-and-offset search and allowlisted filters
// (ADR-0061/0062) so the URL, not component state, owns them (ADR-0042).
// Every page is its own chunk (ADR-0023 route-level code splitting): the
// entry keeps the session guard, the shell, and the sign-in pages.
const scheduleRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/",
  validateSearch: optionalSearch(scheduleSearchSchema),
  component: lazyRouteComponent(
    () => import("../schedule/schedule-route"),
    "ScheduleRoute",
  ),
});

const branchesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/catalogo/sucursales",
  validateSearch: optionalSearch(catalogStatusSearchSchema),
  component: lazyRouteComponent(
    () => import("../catalog/branches/branches-route"),
    "BranchesRoute",
  ),
});

const classTypesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/catalogo/tipos-de-clase",
  validateSearch: optionalSearch(catalogStatusSearchSchema),
  component: lazyRouteComponent(
    () => import("../catalog/class-types/class-types-route"),
    "ClassTypesRoute",
  ),
});

const plansRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/catalogo/planes",
  validateSearch: optionalSearch(planSearchSchema),
  component: lazyRouteComponent(
    () => import("../catalog/plans/plans-route"),
    "PlansRoute",
  ),
});

// AW36 (BKM-004): opened from the account menu, not the sidebar.
const studioRulesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/reglas-del-estudio",
  component: lazyRouteComponent(
    () => import("../studio-rules/studio-rules-route"),
    "StudioRulesRoute",
  ),
});

const pageRoutes = [
  scheduleRoute,
  branchesRoute,
  classTypesRoute,
  plansRoute,
  studioRulesRoute,
  ...backOfficeRoutes,
  ...oversightRoutes,
  ...reportRoutes,
];
/**
 * Loads every page chunk now instead of on its first visit: the specs that
 * render the whole app would otherwise pay each chunk's first load inside
 * their first lookup, and a browser may want the pages warm after Login.
 */
export const preloadAdminPages = (): Promise<unknown> =>
  Promise.all(
    pageRoutes.map((route) => {
      const component = route.options.component as
        { preload?: () => Promise<void> } | undefined;
      return component?.preload?.();
    }),
  );

const routeTree = rootRoute.addChildren([
  ...publicRoutes,
  authenticatedRoute.addChildren(pageRoutes),
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
    ...pagePendingOptions,
  });
}

export type AdminRouter = ReturnType<typeof createAdminRouter>;

declare module "@tanstack/react-router" {
  interface Register {
    router: AdminRouter;
  }
}
