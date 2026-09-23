import { Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "../components/ui/sheet";
import { BranchSelector } from "./branch/branch-selector";
import { SidebarNav } from "./sidebar-nav";
import { useIsNarrowViewport } from "./use-media-query";

function AccountCell() {
  // WEB-002 replaces this with the signed-in Administrator and the AW33 menu.
  return (
    <div
      className="flex items-center gap-2 pl-2 text-nota text-texto"
      title="El menú de usuario llega con el inicio de sesión."
    >
      <span
        aria-hidden="true"
        className="inline-flex size-[26px] items-center justify-center rounded-full bg-rosa-empolvado font-serif text-[12px] text-blanco"
      >
        A
      </span>
      <span className="max-lg:sr-only">Administradora</span>
    </div>
  );
}

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

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-borde bg-blanco px-4 lg:px-6">
      {narrow ? <MenuDrawer /> : null}
      <span className="font-serif text-titulo-2 text-texto">Emma</span>
      <div className="ml-auto flex items-center gap-2">
        <BranchSelector />
        <AccountCell />
      </div>
    </header>
  );
}
