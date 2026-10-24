import { getRouteApi } from "@tanstack/react-router";
import { CoordinatorPayPage } from "./coordinator-pay-page";

const route = getRouteApi("/authenticated/back-office/pago-coordinadora");

export function CoordinatorPayRoute() {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  return (
    <CoordinatorPayPage
      month={search.month}
      onMonthChange={(month) => navigate({ search: { month } })}
    />
  );
}
