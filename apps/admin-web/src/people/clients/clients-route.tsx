import { getRouteApi } from "@tanstack/react-router";
import { ClientsPage } from "./clients-page";

const route = getRouteApi("/authenticated/clientas");

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
