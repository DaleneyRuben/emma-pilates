import { getRouteApi } from "@tanstack/react-router";
import { EvaluationsPage } from "./evaluations-page";

const route = getRouteApi(
  "/authenticated/back-office/evaluaciones-nutricionales",
);

export function EvaluationsRoute() {
  const navigate = route.useNavigate();
  return (
    <EvaluationsPage
      search={route.useSearch()}
      onSearchChange={(change) =>
        void navigate({ search: (previous) => ({ ...previous, ...change }) })
      }
    />
  );
}
