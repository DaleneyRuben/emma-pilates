import { getRouteApi } from "@tanstack/react-router";
import { CashClosesPage } from "./cash-closes-page";

const route = getRouteApi("/authenticated/back-office/caja");

export function CashClosesRoute() {
  const navigate = route.useNavigate();
  return (
    <CashClosesPage
      search={route.useSearch()}
      onSearchChange={(change) =>
        void navigate({ search: (previous) => ({ ...previous, ...change }) })
      }
    />
  );
}
