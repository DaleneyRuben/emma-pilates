import { useQuery } from "@tanstack/react-query";
import { CatchBoundary, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { currentSessionQueryOptions } from "../session/session-queries";
import { pageTitleOf } from "../app/navigation";
import { useDocumentTitle } from "../app/use-document-title";
import { PageRecoveryState } from "../components/page/page-recovery-state";
import { PageTabsContext } from "../components/page/page-tabs-context";
import { activeBranchesQueryOptions } from "./branch/branch-queries";
import { BranchProvider } from "./branch/branch-provider";
import { DestinationTabs } from "./destination-tabs";
import { Sidebar } from "./rail/sidebar";
import { BranchCell, TopBar } from "./top-bar";
import { useIsNarrowViewport } from "./use-media-query";

// Rosa Emma (design/v3/admin): the Rosa profundo sidebar on the left, the
// Rubor band with the top bar over the page header, and the page on 100
// (each page's header draws its destination's tabs); at phone width the
// sidebar becomes the menu drawer of a Rosa profundo top bar and the Branch
// cell opens the band. A
// page that throws while drawing is replaced by the recovery state inside
// the main area (WEB-032); Reintentar resets it, and so does another page's
// match once it is committed (the location moves before the matches do, so
// the pathname would reset the boundary onto the page that just failed).
const noBranches: never[] = [];
const tabs = <DestinationTabs />;

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
  const accountId = useQuery(currentSessionQueryOptions()).data?.accountId;
  const main = useRef<HTMLElement>(null);
  const pathname = useFocusContentOnNavigation(main);
  useDocumentTitle(pageTitleOf(pathname));
  const pageKey = useRouterState({
    select: (state) => state.matches.at(-1)?.id,
  });

  return (
    <BranchProvider
      accountId={accountId}
      branches={branches.data ?? noBranches}
      status={branches.status}
    >
      <a
        href="#contenido"
        className="sr-only tipo-secundario text-texto focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-superficie-hundida focus:px-3 focus:py-2 focus:shadow-popover"
      >
        Saltar al contenido
      </a>
      <div className="flex min-h-svh bg-fondo text-texto">
        {narrow ? null : <Sidebar />}
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main
            id="contenido"
            ref={main}
            tabIndex={-1}
            className="flex flex-1 flex-col bg-fondo px-4 pb-8 outline-none focus-visible:shadow-none lg:px-9 lg:pb-14"
          >
            {narrow ? (
              <div className="-mx-4 flex bg-banda px-4 pt-[18px]">
                <BranchCell />
              </div>
            ) : null}
            {/* WEB-045: a flex column, so a loading state in the page can
                grow into what the main area has left (src/carga.css). */}
            <div className="flex min-w-0 flex-col">
              <PageTabsContext.Provider value={tabs}>
                <CatchBoundary
                  getResetKey={() => pageKey}
                  errorComponent={PageRecoveryState}
                >
                  <Outlet />
                </CatchBoundary>
              </PageTabsContext.Provider>
            </div>
          </main>
        </div>
      </div>
    </BranchProvider>
  );
}
