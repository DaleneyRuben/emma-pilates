import { logoutAdminWebAuthenticationSession } from "@pilates/api-contracts";
import { useQueryClient } from "@tanstack/react-query";
import { useRouteContext, useRouter } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { adminFetch } from "../../api/fetcher";

/**
 * The backend revokes the Authentication Session and clears the cookie;
 * the browser then drops every cached Administrator record before Login.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { sessionExpiry } = useRouteContext({ from: "__root__" });
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);

  const logout = useCallback(async () => {
    setFailed(false);
    setPending(true);
    try {
      await logoutAdminWebAuthenticationSession(undefined, adminFetch);
    } catch {
      setFailed(true);
      setPending(false);
      return;
    }
    sessionExpiry.silence();
    queryClient.clear();
    await router.navigate({ to: "/iniciar-sesion", replace: true });
  }, [queryClient, router, sessionExpiry]);

  return { logout, failed, pending };
}
