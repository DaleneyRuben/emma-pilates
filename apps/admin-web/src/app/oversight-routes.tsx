import { createRoute } from "@tanstack/react-router";
import { EvaluationsPage } from "../oversight/evaluations/evaluations-page";
import { evaluationSearchSchema } from "../oversight/evaluations/evaluation-search";
import { authenticatedRoute } from "./root-routes";

// The read-only oversight lists (WEB-008): AW25–AW27.
const evaluationsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/back-office/evaluaciones-nutricionales",
  validateSearch: evaluationSearchSchema,
  component: function EvaluationsRoute() {
    const navigate = evaluationsRoute.useNavigate();
    return (
      <EvaluationsPage
        search={evaluationsRoute.useSearch()}
        onSearchChange={(change) =>
          void navigate({ search: (previous) => ({ ...previous, ...change }) })
        }
      />
    );
  },
});

export const oversightRoutes = [evaluationsRoute];
