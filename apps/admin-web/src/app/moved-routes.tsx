import { createRoute, redirect } from "@tanstack/react-router";
import { movedPaths } from "./navigation";
import { rootRoute } from "./root-routes";

// Follow-up 232 moved every page into a destination. An old address answers
// before the session guard, so the guard and the Coordinator's check read
// the new page, and its search (filters, page, week) comes along.
export const movedRoutes = Object.entries(movedPaths).map(([from, to]) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path: from,
    beforeLoad: ({ location }) => {
      throw redirect({ href: `${to}${location.searchStr}`, replace: true });
    },
  }),
);
