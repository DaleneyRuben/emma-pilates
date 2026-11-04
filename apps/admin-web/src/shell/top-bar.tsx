import { useRouterState } from "@tanstack/react-router";
import { Building2, Search } from "lucide-react";
import { useState } from "react";
import { findNavigationItem } from "../app/navigation";
import { AccountCell } from "./account/account-cell";
import { BranchSelector } from "./branch/branch-selector";
import { MenuDrawer } from "./rail/menu-drawer";
import { GlobalSearch } from "./search/global-search";
import { useIsNarrowViewport } from "./use-media-query";
import { Wordmark } from "./wordmark";

/**
 * The Branch cell: the selector on a Branch page, «Todo el estudio» on a
 * studio-wide one (follow-up 233), and a note where the page brings its own
 * selector (AW16).
 */
export function BranchCell() {
  const narrow = useIsNarrowViewport();
  const item = useRouterState({
    select: (state) => findNavigationItem(state.location.pathname),
  });

  if (item?.ownBranchFilter === true) {
    return narrow ? null : (
      <p className="text-nota text-tenue">
        El reporte usa su propio filtro de sucursal
      </p>
    );
  }
  if (item?.studioWide === true) {
    return (
      <span className="flex h-11 items-center gap-2 rounded-tarjeta bg-lino px-3.5 text-cuerpo text-texto">
        <Building2
          size={20}
          strokeWidth={1.6}
          aria-hidden="true"
          className="text-primario"
        />
        Todo el estudio
      </span>
    );
  }
  return <BranchSelector />;
}

// P01: the wordmark, the global search, the Branch cell and the signed-in
// person on Marfil, with no bar of its own. P01d: at phone width the menu
// button, the wordmark, a search button and the avatar.
export function TopBar() {
  const narrow = useIsNarrowViewport();
  const [searching, setSearching] = useState(false);

  if (narrow) {
    return (
      <header className="sticky top-0 z-40 flex flex-col bg-superficie">
        <div className="flex h-16 items-center gap-2 px-3">
          <MenuDrawer />
          <Wordmark small className="flex-1 pl-1" />
          <button
            type="button"
            aria-label="Buscar"
            aria-expanded={searching}
            onClick={() => setSearching((open) => !open)}
            className="inline-flex size-11 items-center justify-center rounded-tarjeta bg-lino text-primario focus-visible:shadow-foco"
          >
            <Search size={22} strokeWidth={1.6} aria-hidden="true" />
          </button>
          <AccountCell />
        </div>
        {searching ? <GlobalSearch className="px-3 pb-3" /> : null}
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 flex flex-wrap items-center gap-4 bg-superficie px-10 py-5">
      <Wordmark />
      <GlobalSearch className="max-w-[560px] flex-[1_1_360px]" />
      <span className="flex-1" />
      <BranchCell />
      <AccountCell />
    </header>
  );
}
