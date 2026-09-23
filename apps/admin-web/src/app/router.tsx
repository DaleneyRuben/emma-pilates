import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  redirect,
  type RouterHistory,
} from "@tanstack/react-router";
import type { SessionExpiry } from "../api/session-expiry";
import { loginSearchSchema } from "../auth/auth-search";
import { LoginPage } from "../auth/login-page";
import { RecoverPasswordPage } from "../auth/recover-password-page";
import { listSearchSchema } from "../components/table/pagination";
import { NotFoundPage } from "../pages/not-found-page";
import { PlaceholderPage } from "../pages/placeholder-page";
import { StartupErrorPage } from "../pages/startup-error-page";
import { readSignedInSession } from "../session/session-queries";
import { AdminShell } from "../shell/admin-shell";
import type { Branch } from "../shell/branch/branch-context";
import { placeholderBranches } from "../shell/branch/placeholder-branches";
import { navigationItems } from "./navigation";

export type AdminRouterContext = {
  branches: readonly Branch[];
  queryClient: QueryClient;
  sessionExpiry: SessionExpiry;
};

const rootRoute = createRootRouteWithContext<AdminRouterContext>()({
  component: Outlet,
  notFoundComponent: NotFoundPage,
});

// AW01: a signed-in Administrator has nothing to do on Login.
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/iniciar-sesion",
  validateSearch: loginSearchSchema,
  beforeLoad: async ({ context }) => {
    if ((await readSignedInSession(context.queryClient)) !== null) {
      throw redirect({ to: "/" });
    }
  },
  errorComponent: StartupErrorPage,
  component: function LoginRoute() {
    return <LoginPage search={loginRoute.useSearch()} />;
  },
});

const recoverPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/recuperar-contrasena",
  component: RecoverPasswordPage,
});

// Every sidebar page sits behind the session probe; a signed-out visitor
// goes to Login and comes back to the exact address afterwards.
const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "authenticated",
  beforeLoad: async ({ context, location }) => {
    if ((await readSignedInSession(context.queryClient)) === null) {
      throw redirect({
        to: "/iniciar-sesion",
        search: { redirect: location.href },
      });
    }
  },
  errorComponent: StartupErrorPage,
  component: function AuthenticatedLayout() {
    const { branches } = authenticatedRoute.useRouteContext();
    return <AdminShell branches={branches} />;
  },
});

// List pages validate their page-and-offset search (ADR-0061) so the URL,
// not component state, owns pagination (ADR-0042).
const placeholderRoutes = navigationItems.map((item) =>
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
  loginRoute,
  recoverPasswordRoute,
  authenticatedRoute.addChildren(placeholderRoutes),
]);

export function createAdminRouter(options: {
  history?: RouterHistory;
  branches?: readonly Branch[];
  queryClient: QueryClient;
  sessionExpiry: SessionExpiry;
}) {
  return createRouter({
    routeTree,
    history: options.history,
    context: {
      branches: options.branches ?? placeholderBranches,
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
