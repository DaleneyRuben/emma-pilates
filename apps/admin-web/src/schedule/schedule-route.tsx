import { getRouteApi } from "@tanstack/react-router";
import { SchedulePage } from "./schedule-page";

// The router loads this module on demand (route-level code splitting), so
// the route's typed search and navigation come from its id, not its object.
const route = getRouteApi("/authenticated/");

export function ScheduleRoute() {
  const navigate = route.useNavigate();
  return (
    <SchedulePage
      search={route.useSearch()}
      onWeekChange={(week) => void navigate({ search: { week } })}
    />
  );
}
