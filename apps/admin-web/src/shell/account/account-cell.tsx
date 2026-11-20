import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/cn";
import { bandPillClass } from "../band-pill";
import { StaffPhoto } from "../../components/staff-photo";
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
import { roleLabelOf } from "./role-label";

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

  // P01: her photo or her initials in Rosa tinte (follow-up 241 §1), then
  // her name over her Role.
  const trigger = (
    <button
      type="button"
      aria-label={name === "" ? "Tu cuenta" : `Tu cuenta: ${name}`}
      className={cn(
        narrow
          ? "flex size-11 items-center justify-center rounded-full focus-visible:shadow-foco-solido"
          : cn(bandPillClass, "gap-2.5 pr-3 pl-1.5 text-left"),
      )}
    >
      <StaffPhoto
        name={name}
        photo={profile?.photo}
        size={narrow ? 36 : 32}
        tone={narrow ? "sobre-lateral" : "solido"}
      />
      {narrow ? (
        <span className="sr-only">{name}</span>
      ) : (
        <span className="flex flex-col">
          <span className="tipo-titulo-fila">{name}</span>
          <span className="tipo-secundario">
            {profile === undefined ? "" : roleLabelOf(profile)}
          </span>
        </span>
      )}
      {narrow ? null : (
        <ChevronDown
          size={16}
          strokeWidth={1.7}
          aria-hidden="true"
          className={cn(
            "text-texto transition-transform",
            menuOpen && "rotate-180",
          )}
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
