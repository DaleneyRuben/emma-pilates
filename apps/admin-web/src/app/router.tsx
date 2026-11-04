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
import { movedRoutes } from "./moved-routes";
import { authenticatedRoute, publicRoutes, rootRoute } from "./root-routes";

// List pages validate their page-and-offset search and allowlisted filters
// (ADR-0061/0062) so the URL, not component state, owns them (ADR-0042).
// Every page is its own chunk (ADR-0023 route-level code splitting): the
// entry keeps the session guard, the shell, and the sign-in pages.
// P01 (follow-up 232): where every session starts.
const homeRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/",
  component: lazyRouteComponent(
    () => import("../home/home-route"),
    "HomeRoute",
  ),
});

const scheduleRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/horario",
  validateSearch: optionalSearch(scheduleSearchSchema),
  component: lazyRouteComponent(
    () => import("../schedule/schedule-route"),
    "ScheduleRoute",
  ),
});

const branchesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/ajustes/sucursales",
  validateSearch: optionalSearch(catalogStatusSearchSchema),
  component: lazyRouteComponent(
    () => import("../catalog/branches/branches-route"),
    "BranchesRoute",
  ),
});

const classTypesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/ajustes/tipos-de-clase",
  validateSearch: optionalSearch(catalogStatusSearchSchema),
  component: lazyRouteComponent(
    () => import("../catalog/class-types/class-types-route"),
    "ClassTypesRoute",
  ),
});

const plansRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/ajustes/planes",
  validateSearch: optionalSearch(planSearchSchema),
  component: lazyRouteComponent(
    () => import("../catalog/plans/plans-route"),
    "PlansRoute",
  ),
});

const simulatorRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/informes/simulador",
  component: lazyRouteComponent(
    () => import("../simulator/simulator-route"),
    "SimulatorRoute",
  ),
});

// AW36 (BKM-004): an Ajustes tab, out of the account menu (follow-up 232).
const studioRulesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/ajustes/reglas-del-estudio",
  component: lazyRouteComponent(
    () => import("../studio-rules/studio-rules-route"),
    "StudioRulesRoute",
  ),
});

const pageRoutes = [
  homeRoute,
  scheduleRoute,
  branchesRoute,
  classTypesRoute,
  plansRoute,
  simulatorRoute,
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
  ...movedRoutes,
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
