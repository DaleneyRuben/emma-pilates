import type { CurrentAuthenticationPrincipalDto } from "@pilates/api-contracts";
import { useQueryClient } from "@tanstack/react-query";
import { useRouteContext, useRouter } from "@tanstack/react-router";
import { useCallback } from "react";
import { currentSessionQueryKey } from "./session-queries";

/**
 * After Login or a recovery that opened a browser session: the backend has
 * set the HttpOnly cookie, so the principal it returned becomes the cached
 * session and the next expiry is reported again.
 */
export function useStartSession() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { sessionExpiry } = useRouteContext({ from: "__root__" });

  return useCallback(
    async (principal: CurrentAuthenticationPrincipalDto, href = "/") => {
      queryClient.setQueryData(currentSessionQueryKey, principal);
      sessionExpiry.reset();
      await router.navigate({ href, replace: true });
    },
    [queryClient, router, sessionExpiry],
  );
}
