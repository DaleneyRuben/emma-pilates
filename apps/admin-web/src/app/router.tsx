import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  type RouterHistory,
} from "@tanstack/react-router";
import { listSearchSchema } from "../components/table/pagination";
import { NotFoundPage } from "../pages/not-found-page";
import { PlaceholderPage } from "../pages/placeholder-page";
import { AdminShell } from "../shell/admin-shell";
import type { Branch } from "../shell/branch/branch-context";
import { placeholderBranches } from "../shell/branch/placeholder-branches";
import { navigationItems } from "./navigation";

type AdminRouterContext = {
  branches: readonly Branch[];
};

const rootRoute = createRootRouteWithContext<AdminRouterContext>()({
  component: function RootComponent() {
    const { branches } = rootRoute.useRouteContext();
    return <AdminShell branches={branches} />;
  },
  notFoundComponent: NotFoundPage,
});

// List pages validate their page-and-offset search (ADR-0061) so the URL,
// not component state, owns pagination (ADR-0042).
const placeholderRoutes = navigationItems.map((item) =>
  item.list
    ? createRoute({
        getParentRoute: () => rootRoute,
        path: item.to,
        validateSearch: listSearchSchema,
        component: () => <PlaceholderPage item={item} />,
      })
    : createRoute({
        getParentRoute: () => rootRoute,
        path: item.to,
        component: () => <PlaceholderPage item={item} />,
      }),
);

const routeTree = rootRoute.addChildren(placeholderRoutes);

export function createAdminRouter(
  options: { history?: RouterHistory; branches?: readonly Branch[] } = {},
) {
  return createRouter({
    routeTree,
    history: options.history,
    context: { branches: options.branches ?? placeholderBranches },
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
