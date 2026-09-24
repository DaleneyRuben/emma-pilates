import { getRouteApi } from "@tanstack/react-router";
import { ExpensesPage } from "./expenses-page";

const route = getRouteApi("/authenticated/back-office/gastos");

export function ExpensesRoute() {
  const navigate = route.useNavigate();
  return (
    <ExpensesPage
      search={route.useSearch()}
      onSearchChange={(change) =>
        void navigate({ search: (previous) => ({ ...previous, ...change }) })
      }
    />
  );
}
