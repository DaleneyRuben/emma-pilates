import { getRouteApi } from "@tanstack/react-router";
import { WithdrawalsPage } from "./withdrawals-page";

const route = getRouteApi("/authenticated/back-office/insumos/retiros");

export function WithdrawalsRoute() {
  const navigate = route.useNavigate();
  return (
    <WithdrawalsPage
      search={route.useSearch()}
      onSearchChange={(change) =>
        void navigate({ search: (previous) => ({ ...previous, ...change }) })
      }
    />
  );
}
