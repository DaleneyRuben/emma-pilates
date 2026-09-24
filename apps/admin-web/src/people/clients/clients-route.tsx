import { getRouteApi } from "@tanstack/react-router";
import { ClientsPage } from "./clients-page";

const route = getRouteApi("/authenticated/back-office/clientes");

export function ClientsRoute() {
  const navigate = route.useNavigate();
  return (
    <ClientsPage
      search={route.useSearch()}
      onSearchChange={(change) =>
        void navigate({ search: (previous) => ({ ...previous, ...change }) })
      }
    />
  );
}
