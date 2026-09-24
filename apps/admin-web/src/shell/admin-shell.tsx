import { useQuery } from "@tanstack/react-query";
import { Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { navigationItemOf } from "../app/navigation";
import { useDocumentTitle } from "../app/use-document-title";
import { activeBranchesQueryOptions } from "./branch/branch-queries";
import { BranchProvider } from "./branch/branch-provider";
import { SidebarNav } from "./sidebar-nav";
import { TopBar } from "./top-bar";
import { useIsNarrowViewport } from "./use-media-query";

// AW02 and design/README.md: a persistent 236px sidebar whose top cell holds
// the one "Emma" wordmark, a top bar with the Branch selector and the account
// cell, and the main area on Superficie; the sidebar collapses to a drawer
// on narrow browsers, where the top bar carries the wordmark instead.
const noBranches: never[] = [];

// Moving to another page puts focus on its content, so a keyboard or screen
// reader user does not start again from the top of the sidebar; the first
// page keeps the browser's own focus.
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
  useDocumentTitle(navigationItemOf(pathname)?.label);

  return (
    <BranchProvider
      branches={branches.data ?? noBranches}
      status={branches.status}
    >
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:border focus:border-primario focus:bg-blanco focus:px-3 focus:py-2 focus:text-nota focus:font-medium focus:text-primario focus:shadow-popover"
      >
        Saltar al contenido
      </a>
      <div className="flex min-h-svh bg-arena text-texto">
        {narrow ? null : (
          <aside className="sticky top-0 hidden h-svh w-[236px] shrink-0 overflow-y-auto border-r border-borde bg-blanco lg:block">
            <div className="flex h-14 items-center border-b border-borde px-6 font-serif text-titulo-2">
              Emma
            </div>
            <SidebarNav />
          </aside>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main
            id="contenido"
            ref={main}
            tabIndex={-1}
            className="flex-1 bg-superficie px-4 py-5 outline-none focus-visible:shadow-none lg:px-8 lg:py-7"
          >
            <Outlet />
          </main>
        </div>
      </div>
    </BranchProvider>
  );
}
