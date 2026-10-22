import { Outlet, useRouterState } from "@tanstack/react-router";
import { useLayoutEffect } from "react";

// WEB-035, design follow-up 106: index.html draws the logo on Crema before
// any script runs, outside the React root, so React's first commit does not
// blank the page; the root route takes it away once the first page is on
// screen, never while a match is still pending (the pending state it would
// uncover is the same logo starting its animation again).
export const startupStateId = "arranque";

export function RootLayout() {
  const firstPageDrawn = useRouterState({
    select: (state) =>
      state.matches.length > 0 &&
      state.matches.every((match) => match.status !== "pending"),
  });

  useLayoutEffect(() => {
    if (firstPageDrawn) document.getElementById(startupStateId)?.remove();
  }, [firstPageDrawn]);

  return <Outlet />;
}
