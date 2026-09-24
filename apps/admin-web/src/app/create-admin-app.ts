import type { RouterHistory } from "@tanstack/react-router";
import { createAdminQueryClient } from "../api/query-client";
import { createSessionExpiry } from "../api/session-expiry";
import { createAdminRouter, type AdminRouter } from "./router";

/**
 * One QueryClient and router per page load. When any request finds the
 * session gone, cached Administrator data is dropped and the browser returns
 * to Login once, remembering where the Administrator was.
 */
export function createAdminApp(options: { history?: RouterHistory } = {}) {
  const routerRef: { current?: AdminRouter } = {};
  const sessionExpiry = createSessionExpiry(() => {
    const router = routerRef.current;
    queryClient.clear();
    if (router === undefined) return;
    void router.navigate({
      to: "/iniciar-sesion",
      search: {
        redirect: router.state.location.href,
        notice: "session-ended",
      },
    });
  });
  const queryClient = createAdminQueryClient({ sessionExpiry });
  const router = createAdminRouter({
    history: options.history,
    queryClient,
    sessionExpiry,
  });
  routerRef.current = router;

  return { queryClient, router, sessionExpiry };
}

export type AdminAppInstance = ReturnType<typeof createAdminApp>;
