import type { QueryClient } from "@tanstack/react-query";
import { z } from "zod";
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
import { CreatePasswordPage } from "../auth/create-password-page";
import { LoginPage } from "../auth/login-page";
import { RecoverPasswordPage } from "../auth/recover-password-page";
import { BranchesPage } from "../catalog/branches/branches-page";
import { ClassTypesPage } from "../catalog/class-types/class-types-page";
import { catalogStatusSearchSchema } from "../catalog/catalog-search";
import { listSearchSchema } from "../components/table/pagination";
import { NotFoundPage } from "../pages/not-found-page";
import { PlaceholderPage } from "../pages/placeholder-page";
import { StartupErrorPage } from "../pages/startup-error-page";
import { readSignedInSession } from "../session/session-queries";
import { AdminShell } from "../shell/admin-shell";
import { navigationItems } from "./navigation";

export type AdminRouterContext = {
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

// AW32: the one page every emailed Activation or Password-Recovery Link
// opens; the inspected purpose, not the address, picks the variant.
const createPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/crear-contrasena",
  validateSearch: z.object({
    token: z.string().min(1).optional().catch(undefined),
  }),
  component: function CreatePasswordRoute() {
    const { token } = createPasswordRoute.useSearch();
    return <CreatePasswordPage key={token} token={token} />;
  },
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
  component: AdminShell,
});

// List pages validate their page-and-offset search and allowlisted filters
// (ADR-0061/0062) so the URL, not component state, owns them (ADR-0042).
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

const pageRoutes = [branchesRoute, classTypesRoute];
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
  loginRoute,
  recoverPasswordRoute,
  createPasswordRoute,
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
