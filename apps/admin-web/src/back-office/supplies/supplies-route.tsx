import { getRouteApi } from "@tanstack/react-router";
import { SuppliesPage } from "./supplies-page";

const route = getRouteApi("/authenticated/back-office/insumos");

export function SuppliesRoute() {
  const navigate = route.useNavigate();
  return (
    <SuppliesPage
      search={route.useSearch()}
      onSearchChange={(change) =>
        void navigate({ search: (previous) => ({ ...previous, ...change }) })
      }
    />
  );
}
