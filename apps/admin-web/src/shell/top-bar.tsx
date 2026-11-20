import { useRouterState } from "@tanstack/react-router";
import { Building2, MapPin, Search } from "lucide-react";
import { useState } from "react";
import { findNavigationItem } from "../app/navigation";
import { cn } from "../lib/cn";
import { AccountCell } from "./account/account-cell";
import { bandPillClass } from "./band-pill";
import { BranchSelector } from "./branch/branch-selector";
import { MenuDrawer } from "./rail/menu-drawer";
import { GlobalSearch } from "./search/global-search";
import { useIsNarrowViewport } from "./use-media-query";

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
      <p className={cn(bandPillClass, "tipo-compacto hover:bg-superficie")}>
        <MapPin size={18} strokeWidth={1.6} aria-hidden="true" />
        El reporte usa su propio filtro de sucursal
      </p>
    );
  }
  if (item?.studioWide === true) {
    return (
      <span className={cn(bandPillClass, "hover:bg-superficie")}>
        <Building2 size={18} strokeWidth={1.6} aria-hidden="true" />
        Todo el estudio
      </span>
    );
  }
  return <BranchSelector />;
}

// Rosa Emma (rw.py frame): on a wide screen the band's first row, the search
// on the left and the Branch cell and the signed-in person on the right; the
// page header carries on the band below it. At phone width a Rosa profundo
// bar with the menu, «Emma Pilates Studio», a search button and the avatar.
export function TopBar() {
  const narrow = useIsNarrowViewport();
  const [searching, setSearching] = useState(false);

  if (narrow) {
    return (
      <header className="sticky top-0 z-40 flex flex-col bg-lateral">
        <div className="flex h-16 items-center gap-3 px-3">
          <MenuDrawer />
          <span className="flex-1 tipo-titulo-bloque whitespace-nowrap text-sobre-primario">
            Emma Pilates Studio
          </span>
          <button
            type="button"
            aria-label="Buscar"
            aria-expanded={searching}
            onClick={() => setSearching((open) => !open)}
            className="inline-flex size-11 items-center justify-center rounded-boton text-sobre-primario focus-visible:shadow-foco-solido"
          >
            <Search size={22} strokeWidth={1.7} aria-hidden="true" />
          </button>
          <AccountCell />
        </div>
        {searching ? <GlobalSearch className="px-3 pb-3" /> : null}
      </header>
    );
  }

  return (
    <header className="flex flex-wrap items-center gap-3 bg-banda px-9 pt-[22px]">
      <GlobalSearch className="w-[420px] max-w-full" />
      <span className="flex-1" />
      <BranchCell />
      <AccountCell />
    </header>
  );
}
