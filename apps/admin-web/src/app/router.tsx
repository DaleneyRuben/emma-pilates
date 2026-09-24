import type { QueryClient } from "@tanstack/react-query";
import {
  createRoute,
  createRouter,
  type RouterHistory,
} from "@tanstack/react-router";
import type { SessionExpiry } from "../api/session-expiry";
import { BranchesPage } from "../catalog/branches/branches-page";
import { ClassTypesPage } from "../catalog/class-types/class-types-page";
import {
  catalogStatusSearchSchema,
  planSearchSchema,
} from "../catalog/catalog-search";
import { PlansPage } from "../catalog/plans/plans-page";
import { listSearchSchema } from "../components/table/pagination";
import { PlaceholderPage } from "../pages/placeholder-page";
import { SchedulePage } from "../schedule/schedule-page";
import { scheduleSearchSchema } from "../schedule/schedule-search";
import { backOfficeRoutes } from "./back-office-routes";
import { navigationItems } from "./navigation";
import { oversightRoutes } from "./oversight-routes";
import { authenticatedRoute, publicRoutes, rootRoute } from "./root-routes";

// List pages validate their page-and-offset search and allowlisted filters
// (ADR-0061/0062) so the URL, not component state, owns them (ADR-0042).
const scheduleRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/",
  validateSearch: scheduleSearchSchema,
  component: function ScheduleRoute() {
    const navigate = scheduleRoute.useNavigate();
    return (
      <SchedulePage
        search={scheduleRoute.useSearch()}
        onWeekChange={(week) => void navigate({ search: { week } })}
      />
    );
  },
});

const branchesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/catalogo/sucursales",
  validateSearch: catalogStatusSearchSchema,
  component: function BranchesRoute() {
    const navigate = branchesRoute.useNavigate();
    return (
      <BranchesPage
        search={branchesRoute.useSearch()}
        onSearchChange={(change) =>
          void navigate({ search: (previous) => ({ ...previous, ...change }) })
        }
      />
    );
  },
});

const classTypesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/catalogo/tipos-de-clase",
  validateSearch: catalogStatusSearchSchema,
  component: function ClassTypesRoute() {
    const navigate = classTypesRoute.useNavigate();
    return (
      <ClassTypesPage
        search={classTypesRoute.useSearch()}
        onSearchChange={(change) =>
          void navigate({ search: (previous) => ({ ...previous, ...change }) })
        }
      />
    );
  },
});

const plansRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/catalogo/planes",
  validateSearch: planSearchSchema,
  component: function PlansRoute() {
    const navigate = plansRoute.useNavigate();
    return (
      <PlansPage
        search={plansRoute.useSearch()}
        onSearchChange={(change) =>
          void navigate({ search: (previous) => ({ ...previous, ...change }) })
        }
      />
    );
  },
});

const pageRoutes = [
  scheduleRoute,
  branchesRoute,
  classTypesRoute,
  plansRoute,
  ...backOfficeRoutes,
  ...oversightRoutes,
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
