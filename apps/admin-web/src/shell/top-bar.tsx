import { useRouterState } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "../components/ui/sheet";
import { AccountCell } from "./account/account-cell";
import { findNavigationItem } from "../app/navigation";
import { BranchSelector } from "./branch/branch-selector";
import { SidebarNav } from "./sidebar-nav";
import { useIsNarrowViewport } from "./use-media-query";

function MenuDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Abrir menú">
          <Menu size={20} strokeWidth={1.6} aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="overflow-y-auto">
        <SheetTitle className="sr-only">Menú</SheetTitle>
        <div className="flex h-14 items-center px-6 font-serif text-titulo-2 text-texto">
          Emma
        </div>
        <SidebarNav onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

export function TopBar() {
  const narrow = useIsNarrowViewport();
  const ownBranchFilter = useRouterState({
    select: (state) =>
      findNavigationItem(state.location.pathname)?.ownBranchFilter === true,
  });

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-borde bg-blanco px-4 lg:px-6">
      {narrow ? <MenuDrawer /> : null}
      <span className="font-serif text-titulo-2 text-texto">Emma</span>
      <div className="ml-auto flex items-center gap-2">
        {!ownBranchFilter ? (
          <BranchSelector />
        ) : narrow ? null : (
          <p className="text-nota text-texto-tenue">
            El reporte usa su propio filtro de sucursal
          </p>
        )}
        <AccountCell />
      </div>
    </header>
  );
}
