import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  type RouterHistory,
} from "@tanstack/react-router";
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

const placeholderRoutes = navigationItems.map((item) =>
  createRoute({
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
