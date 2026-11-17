import { getRouteApi } from "@tanstack/react-router";
import { useCallback } from "react";
import { ClientsPage } from "./clients-page";

const route = getRouteApi("/authenticated/clientas");

export function ClientsRoute() {
  const navigate = route.useNavigate();
  // FIX-063: a link's `cliente` is replaced away, so Back leaves Clientes.
  const forgetLinkedClient = useCallback(
    () =>
      void navigate({
        search: (previous) => ({ ...previous, cliente: undefined }),
        replace: true,
      }),
    [navigate],
  );
  return (
    <ClientsPage
      search={route.useSearch()}
      onSearchChange={(change) =>
        void navigate({ search: (previous) => ({ ...previous, ...change }) })
      }
      onLinkedClientSettled={forgetLinkedClient}
    />
  );
}
