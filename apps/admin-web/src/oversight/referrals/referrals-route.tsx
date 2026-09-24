import { getRouteApi } from "@tanstack/react-router";
import { ReferralsPage } from "./referrals-page";

const route = getRouteApi("/authenticated/promociones/referidos");

export function ReferralsRoute() {
  const navigate = route.useNavigate();
  return (
    <ReferralsPage
      search={route.useSearch()}
      onSearchChange={(change) =>
        void navigate({ search: (previous) => ({ ...previous, ...change }) })
      }
    />
  );
}
