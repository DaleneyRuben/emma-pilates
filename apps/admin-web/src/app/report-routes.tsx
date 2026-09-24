import { createRoute, lazyRouteComponent } from "@tanstack/react-router";
import { reportSearchSchema } from "../report/report-search";
import { optionalSearch } from "../components/table/pagination";
import { authenticatedRoute } from "./root-routes";

// AW16 (WEB-009): the report's Branch and range live in the address.
const reportRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/reporte",
  validateSearch: optionalSearch(reportSearchSchema),
  component: lazyRouteComponent(
    () => import("../report/report-route"),
    "ReportRoute",
  ),
});

export const reportRoutes = [reportRoute];
