import { getRouteApi } from "@tanstack/react-router";
import { PayStatementsPage } from "./pay-statements-page";

const route = getRouteApi("/authenticated/back-office/pagos-instructoras");

export function PayStatementsRoute() {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  return (
    <PayStatementsPage
      month={search.month}
      onMonthChange={(month) => navigate({ search: { month } })}
    />
  );
}
