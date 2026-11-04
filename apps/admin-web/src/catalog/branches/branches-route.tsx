import { getRouteApi } from "@tanstack/react-router";
import { BranchesPage } from "./branches-page";

const route = getRouteApi("/authenticated/ajustes/sucursales");

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
