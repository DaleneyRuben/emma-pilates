import { createRoute } from "@tanstack/react-router";
import { ReportPage } from "../report/report-page";
import { reportSearchSchema } from "../report/report-search";
import { authenticatedRoute } from "./root-routes";

// AW16 (WEB-009): the report's Branch and range live in the address.
const reportRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/reporte",
  validateSearch: reportSearchSchema,
  component: function ReportRoute() {
    const navigate = reportRoute.useNavigate();
    return (
      <ReportPage
        search={reportRoute.useSearch()}
        onSearchChange={(change) =>
          void navigate({ search: (previous) => ({ ...previous, ...change }) })
        }
      />
    );
  },
});

export const reportRoutes = [reportRoute];
