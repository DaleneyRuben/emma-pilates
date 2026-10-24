import { getRouteApi } from "@tanstack/react-router";
import { FeedbackPage } from "./feedback-page";

const route = getRouteApi("/authenticated/comentarios");

export function FeedbackRoute() {
  const navigate = route.useNavigate();
  return (
    <FeedbackPage
      search={route.useSearch()}
      onSearchChange={(change) =>
        void navigate({ search: (previous) => ({ ...previous, ...change }) })
      }
    />
  );
}
