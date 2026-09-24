import { getRouteApi } from "@tanstack/react-router";
import { PlansPage } from "./plans-page";

const route = getRouteApi("/authenticated/catalogo/planes");

export function PlansRoute() {
  const navigate = route.useNavigate();
  return (
    <PlansPage
      search={route.useSearch()}
      onSearchChange={(change) =>
        void navigate({ search: (previous) => ({ ...previous, ...change }) })
      }
    />
  );
}
