import { createRoute, redirect } from "@tanstack/react-router";
import { movedPaths } from "./navigation";
import { rootRoute } from "./root-routes";

// The old address's search (filters, page, week) with the new page's own
// (WEB-040's Fundadora chip) on top.
const withSearch = (to: string, searchStr: string): string => {
  const [path, fixed] = to.split("?");
  if (fixed === undefined) return `${to}${searchStr}`;
  const search = new URLSearchParams(searchStr);
  new URLSearchParams(fixed).forEach((value, key) => search.set(key, value));
  return `${path}?${search.toString()}`;
};

// Follow-up 232 moved every page into a destination. An old address answers
// before the session guard, so the guard and the Coordinator's check read
// the new page, and its search (filters, page, week) comes along.
export const movedRoutes = Object.entries(movedPaths).map(([from, to]) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path: from,
    beforeLoad: ({ location }) => {
      throw redirect({
        href: withSearch(to, location.searchStr),
        replace: true,
      });
    },
  }),
);
