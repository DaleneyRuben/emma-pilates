import { useQuery } from "@tanstack/react-query";
import { CatchBoundary, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { pageTitleOf } from "../app/navigation";
import { useDocumentTitle } from "../app/use-document-title";
import { PageRecoveryState } from "../components/page/page-recovery-state";
import { activeBranchesQueryOptions } from "./branch/branch-queries";
import { BranchProvider } from "./branch/branch-provider";
import { DestinationTabs } from "./destination-tabs";
import { IconRail } from "./rail/icon-rail";
import { BranchCell, TopBar } from "./top-bar";
import { useIsNarrowViewport } from "./use-media-query";

// Follow-up 232 (P01): the icon rail on the left, the top bar and the page
// on Marfil, and the destination's tabs above the page; at phone width the
// rail becomes the menu drawer and the Branch cell moves above the tabs. A
// page that throws while drawing is replaced by the recovery state inside
// the main area (WEB-032); Reintentar resets it, and so does another page's
// match once it is committed (the location moves before the matches do, so
// the pathname would reset the boundary onto the page that just failed).
const noBranches: never[] = [];

// Moving to another page puts focus on its content, so a keyboard or screen
// reader user does not start again from the top of the rail; the first page
// keeps the browser's own focus.
function useFocusContentOnNavigation(
  main: React.RefObject<HTMLElement | null>,
) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const shown = useRef(pathname);
  useEffect(() => {
    if (shown.current === pathname) return;
    shown.current = pathname;
    main.current?.focus();
  }, [main, pathname]);
  return pathname;
}

export function AdminShell() {
  const narrow = useIsNarrowViewport();
  const branches = useQuery(activeBranchesQueryOptions());
  const main = useRef<HTMLElement>(null);
  const pathname = useFocusContentOnNavigation(main);
  useDocumentTitle(pageTitleOf(pathname));
  const pageKey = useRouterState({
    select: (state) => state.matches.at(-1)?.id,
  });

  return (
    <BranchProvider
      branches={branches.data ?? noBranches}
      status={branches.status}
    >
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-rosa-tinte focus:px-3 focus:py-2 focus:text-nota focus:font-medium focus:text-rosa-enlace focus:shadow-popover"
      >
        Saltar al contenido
      </a>
      <div className="flex min-h-svh bg-superficie text-texto">
        {narrow ? null : <IconRail />}
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main
            id="contenido"
            ref={main}
            tabIndex={-1}
            className="flex flex-1 flex-col gap-5 bg-superficie px-5 pt-2 pb-8 outline-none focus-visible:shadow-none lg:px-10 lg:pb-14"
          >
            {narrow ? (
              <div className="flex">
                <BranchCell />
              </div>
            ) : null}
            <DestinationTabs />
            <div className="min-w-0">
              <CatchBoundary
                getResetKey={() => pageKey}
                errorComponent={PageRecoveryState}
              >
                <Outlet />
              </CatchBoundary>
            </div>
          </main>
        </div>
      </div>
    </BranchProvider>
  );
}
