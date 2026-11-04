import { getRouteApi } from "@tanstack/react-router";
import { PayStatementsPage } from "./pay-statements-page";

const route = getRouteApi("/authenticated/dinero/sueldos");

export function PayStatementsRoute() {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  return (
    <PayStatementsPage
      search={search}
      onSearchChange={(next) => navigate({ search: next })}
    />
  );
}
