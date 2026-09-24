import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/cn";
import { initials } from "../../lib/initials";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "../../components/ui/sheet";
import { staffProfileQueryOptions } from "../../session/staff-profile-query";
import { useIsNarrowViewport } from "../use-media-query";
import { AccountMenu } from "./account-menu";
import { ChangePasswordPanel } from "./change-password-panel";

/**
 * AW33: the top-bar user cell on every authenticated page. A popover on
 * desktop and a bottom sheet when narrow; the password panel is the 408 px
 * side panel or a full-screen sheet.
 */
export function AccountCell() {
  const narrow = useIsNarrowViewport();
  const { data: profile } = useQuery(staffProfileQueryOptions());
  const [menuOpen, setMenuOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const name = profile?.name ?? "";

  const trigger = (
    <button
      type="button"
      aria-label={name === "" ? "Tu cuenta" : `Tu cuenta: ${name}`}
      className="flex items-center gap-2 rounded-control py-1 pr-1 pl-2 text-nota text-texto hover:bg-hover-fila focus-visible:shadow-foco"
    >
      <span
        aria-hidden="true"
        className="inline-flex size-[26px] items-center justify-center rounded-full bg-rosa-empolvado font-serif text-ayuda text-blanco"
      >
        {initials(name)}
      </span>
      <span className={cn(narrow && "sr-only")}>{name}</span>
      {narrow ? null : (
        <ChevronDown
          size={14}
          strokeWidth={1.6}
          aria-hidden="true"
          className={cn("transition-transform", menuOpen && "rotate-180")}
        />
      )}
    </button>
  );

  const openPanel = () => {
    setMenuOpen(false);
    setPanelOpen(true);
  };
  const menu = (
    <AccountMenu
      key={String(menuOpen)}
      profile={profile}
      onChangePassword={openPanel}
    />
  );

  return (
    <>
      {narrow ? (
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>{trigger}</SheetTrigger>
          <SheetContent
            side="bottom"
            hideClose
            aria-describedby={undefined}
            data-presentation="bottom-sheet"
          >
            <SheetTitle className="sr-only">Tu cuenta</SheetTitle>
            {menu}
          </SheetContent>
        </Sheet>
      ) : (
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>{trigger}</PopoverTrigger>
          <PopoverContent
            align="end"
            aria-label="Tu cuenta"
            data-presentation="popover"
            className="w-[240px]"
          >
            {menu}
          </PopoverContent>
        </Popover>
      )}
      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        {panelOpen ? <ChangePasswordPanel narrow={narrow} /> : null}
      </Sheet>
    </>
  );
}
