import { getRouteApi } from "@tanstack/react-router";
import { StaffPage } from "./staff-page";

const route = getRouteApi("/authenticated/back-office/personal");

export function StaffRoute() {
  const navigate = route.useNavigate();
  return (
    <StaffPage
      search={route.useSearch()}
      onSearchChange={(change) =>
        void navigate({ search: (previous) => ({ ...previous, ...change }) })
      }
    />
  );
}
