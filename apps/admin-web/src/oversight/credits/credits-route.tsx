import { getRouteApi } from "@tanstack/react-router";
import { CreditsPage } from "./credits-page";

const route = getRouteApi("/authenticated/promociones/creditos");

export function CreditsRoute() {
  const navigate = route.useNavigate();
  return (
    <CreditsPage
      search={route.useSearch()}
      onSearchChange={(change) =>
        void navigate({ search: (previous) => ({ ...previous, ...change }) })
      }
    />
  );
}
