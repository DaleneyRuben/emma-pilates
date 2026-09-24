import { useQuery } from "@tanstack/react-query";
import { Outlet } from "@tanstack/react-router";
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

export function AdminShell() {
  const narrow = useIsNarrowViewport();
  const branches = useQuery(activeBranchesQueryOptions());

  return (
    <BranchProvider
      branches={branches.data ?? noBranches}
      status={branches.status}
    >
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
          <main className="flex-1 bg-superficie px-4 py-5 lg:px-8 lg:py-7">
            <Outlet />
          </main>
        </div>
      </div>
    </BranchProvider>
  );
}
