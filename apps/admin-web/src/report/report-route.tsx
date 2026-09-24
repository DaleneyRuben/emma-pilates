import { getRouteApi } from "@tanstack/react-router";
import { ReportPage } from "./report-page";

const route = getRouteApi("/authenticated/reporte");

export function ReportRoute() {
  const navigate = route.useNavigate();
  return (
    <ReportPage
      search={route.useSearch()}
      onSearchChange={(change) =>
        void navigate({ search: (previous) => ({ ...previous, ...change }) })
      }
    />
  );
}
