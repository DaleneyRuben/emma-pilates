import { getRouteApi } from "@tanstack/react-router";
import { PayrollPage } from "./payroll-page";

const route = getRouteApi("/authenticated/back-office/nomina");

export function PayrollRoute() {
  const navigate = route.useNavigate();
  return (
    <PayrollPage
      search={route.useSearch()}
      onSearchChange={(change) =>
        void navigate({ search: (previous) => ({ ...previous, ...change }) })
      }
    />
  );
}
