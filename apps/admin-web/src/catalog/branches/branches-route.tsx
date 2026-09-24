import { getRouteApi } from "@tanstack/react-router";
import { BranchesPage } from "./branches-page";

const route = getRouteApi("/authenticated/catalogo/sucursales");

export function BranchesRoute() {
  const navigate = route.useNavigate();
  return (
    <BranchesPage
      search={route.useSearch()}
      onSearchChange={(change) =>
        void navigate({ search: (previous) => ({ ...previous, ...change }) })
      }
    />
  );
}
