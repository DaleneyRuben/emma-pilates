import type { ReactNode } from "react";
import { useIsNarrowViewport } from "../../shell/use-media-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";

/**
 * Design system → Side-panel form convention: a 408 px panel over the
 * dimmed page on desktop, a full-screen sheet on narrow browsers. Closing it
 * (icon, scrim, Esc) discards what was typed.
 */
export function SidePanel({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  const narrow = useIsNarrowViewport();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {open ? (
        <SheetContent
          side={narrow ? "full" : "right"}
          data-presentation={narrow ? "full-screen" : "side-panel"}
          {...(description === undefined
            ? { "aria-describedby": undefined }
            : {})}
          className="overflow-y-auto"
          onOpenAutoFocus={(event) => {
            const panel = event.currentTarget;
            if (!(panel instanceof HTMLElement)) return;
            if (panel.querySelector("input, select, textarea")) return;
            event.preventDefault();
            panel
              .querySelector<HTMLElement>("[data-slot=sheet-title]")
              ?.focus();
          }}
        >
          <SheetHeader className="pr-12">
            <SheetTitle>{title}</SheetTitle>
            {description === undefined ? null : (
              <SheetDescription>{description}</SheetDescription>
            )}
          </SheetHeader>
          {children}
        </SheetContent>
      ) : null}
    </Sheet>
  );
}

export function SidePanelBody({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 flex-col gap-4 px-5 py-4">{children}</div>;
}

export function SidePanelFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-t border-borde px-5 py-4">
      {children}
    </div>
  );
}
