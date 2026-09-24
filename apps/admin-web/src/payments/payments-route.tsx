import { getRouteApi } from "@tanstack/react-router";
import { PaymentsPage } from "./payments-page";

const route = getRouteApi("/authenticated/back-office/pagos");

export function PaymentsRoute() {
  const navigate = route.useNavigate();
  return (
    <PaymentsPage
      search={route.useSearch()}
      onSearchChange={(change) =>
        void navigate({ search: (previous) => ({ ...previous, ...change }) })
      }
    />
  );
}
