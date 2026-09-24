import type { QueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  createRootRouteWithContext,
  createRoute,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import type { SessionExpiry } from "../api/session-expiry";
import { loginSearchSchema } from "../auth/auth-search";
import { CreatePasswordPage } from "../auth/create-password-page";
import { LoginPage } from "../auth/login-page";
import { RecoverPasswordPage } from "../auth/recover-password-page";
import { NotFoundPage } from "../pages/not-found-page";
import { StartupErrorPage } from "../pages/startup-error-page";
import { readSignedInSession } from "../session/session-queries";
import { AdminShell } from "../shell/admin-shell";

export type AdminRouterContext = {
  queryClient: QueryClient;
  sessionExpiry: SessionExpiry;
};

export const rootRoute = createRootRouteWithContext<AdminRouterContext>()({
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
export const authenticatedRoute = createRoute({
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

export const publicRoutes = [
  loginRoute,
  recoverPasswordRoute,
  createPasswordRoute,
];
