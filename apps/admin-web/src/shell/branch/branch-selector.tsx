import { Link, useRouterState } from "@tanstack/react-router";
import { Check, ChevronDown, MapPin } from "lucide-react";
import {
  useId,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { findNavigationItem } from "../../app/navigation";
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
import { cn } from "../../lib/cn";
import { useIsNarrowViewport } from "../use-media-query";
import type { Branch } from "./branch-context";
import { useBranchSelection } from "./use-branch-selection";

// AW34's group label: 10px uppercase, 0.18em, Texto muy tenue.
const labelClass =
  "px-4 pt-1 pb-2 font-sans text-[10px] font-medium tracking-[0.18em] text-texto-muy-tenue uppercase";

// A listbox with a roving tabindex: Tab reaches the selected Branch, the
// arrow keys (and Home/End) move between the options, Enter or Space choose.
function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
  const options = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]'),
  );
  const current = options.indexOf(document.activeElement as HTMLButtonElement);
  const last = options.length - 1;
  const next: Record<string, number> = {
    ArrowDown: current >= last ? 0 : current + 1,
    ArrowUp: current <= 0 ? last : current - 1,
    Home: 0,
    End: last,
  };
  const target = next[event.key];
  if (target === undefined || options.length === 0) return;
  event.preventDefault();
  options[target]?.focus();
}

// AW34: the shell's Branch cell. One Branch always; "Todas las sucursales"
// exists only inside the report's own selector (AW16).
function BranchRows({
  title,
  labelId,
  studioWideNote,
  onDone,
  rowHeightClass,
}: {
  /** The "Sucursal" label: a plain line in the popover, the sheet's title. */
  title: ReactNode;
  labelId: string;
  studioWideNote: string | undefined;
  onDone: () => void;
  rowHeightClass: string;
}) {
  const { branches, status, selectedBranch, selectBranch } =
    useBranchSelection();

  const choose = (branch: Branch) => {
    selectBranch(branch.id);
    onDone();
  };

  return (
    <div className="flex flex-col py-2">
      {title}
      {studioWideNote === undefined ? null : (
        <p className="mx-2 mb-2 rounded-control border border-divisor bg-superficie px-3 py-2 text-ayuda text-texto-tenue">
          Esta página no se filtra por sucursal — {studioWideNote}
        </p>
      )}
      {branches.length === 0 ? (
        <p
          role={status === "error" ? "alert" : undefined}
          className="px-4 py-2 text-ayuda text-texto-tenue"
        >
          {status === "error"
            ? "No pudimos cargar las sucursales. Inténtalo de nuevo."
            : status === "pending"
              ? "Cargando sucursales…"
              : "Todavía no hay sucursales activas."}
        </p>
      ) : null}
      <div
        role="listbox"
        aria-labelledby={labelId}
        onKeyDown={moveFocus}
        className="flex flex-col"
      >
        {branches.map((branch) => {
          const selected = branch.id === selectedBranch?.id;
          return (
            <button
              key={branch.id}
              type="button"
              role="option"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => choose(branch)}
              className={cn(
                "flex items-center justify-between gap-3 px-4 text-left text-fila-menu text-texto hover:bg-hover-fila focus-visible:bg-hover-fila focus-visible:shadow-none",
                rowHeightClass,
                selected &&
                  "bg-primario-tinte font-medium text-primario-profundo hover:bg-primario-tinte",
              )}
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{branch.name}</span>
                <span
                  className={cn(
                    "truncate text-ayuda font-normal text-texto-muy-tenue",
                    selected && "text-primario-profundo/70",
                  )}
                >
                  {branch.address}
                </span>
              </span>
              {selected ? (
                <Check size={16} strokeWidth={1.8} aria-hidden="true" />
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="mx-4 my-2 h-px bg-divisor" aria-hidden="true" />
      <Link
        to="/catalogo/sucursales"
        onClick={onDone}
        className="flex h-9 items-center px-4 text-fila-menu text-primario hover:bg-hover-fila hover:text-primario-presionado"
      >
        Gestionar sucursales
      </Link>
    </div>
  );
}

type BranchTriggerProps = ComponentProps<"button"> & {
  open: boolean;
  branch?: Branch;
};

// Radix Slot merges the trigger props (ref, aria-expanded, handlers) into
// this element, so everything it passes must reach the button.
function BranchTrigger({
  open,
  branch,
  className,
  ...props
}: BranchTriggerProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-[38px] items-center gap-2 rounded-control border border-transparent px-3 text-nota text-texto hover:border-borde-fuerte hover:bg-superficie",
        open && "border-borde-fuerte bg-superficie",
        className,
      )}
      {...props}
    >
      <MapPin
        size={16}
        strokeWidth={1.6}
        aria-hidden="true"
        className="text-texto-tenue"
      />
      {branch === undefined ? (
        <span className="text-texto-tenue">Sin sucursal</span>
      ) : (
        <>
          <span className="text-texto-tenue">Sucursal</span>{" "}
          <span className="font-medium">{branch.name}</span>
        </>
      )}
      <ChevronDown
        size={14}
        strokeWidth={1.8}
        aria-hidden="true"
        className={cn(
          "text-texto-tenue transition-transform",
          open && "rotate-180",
        )}
      />
    </button>
  );
}

export function BranchSelector() {
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const narrow = useIsNarrowViewport();
  const { selectedBranch } = useBranchSelection();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const studioWideNote = findNavigationItem(pathname)?.studioWide;
  const close = () => setOpen(false);

  if (narrow) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <BranchTrigger open={open} branch={selectedBranch} />
        </SheetTrigger>
        <SheetContent
          side="bottom"
          data-side="bottom"
          aria-labelledby={labelId}
          hideClose
          className="pb-[env(safe-area-inset-bottom)]"
        >
          <BranchRows
            title={
              <SheetTitle id={labelId} className={labelClass}>
                Sucursal
              </SheetTitle>
            }
            labelId={labelId}
            studioWideNote={studioWideNote}
            onDone={close}
            rowHeightClass="min-h-12"
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <BranchTrigger open={open} branch={selectedBranch} />
      </PopoverTrigger>
      <PopoverContent align="start" aria-labelledby={labelId}>
        <BranchRows
          title={
            <p id={labelId} className={labelClass}>
              Sucursal
            </p>
          }
          labelId={labelId}
          studioWideNote={studioWideNote}
          onDone={close}
          rowHeightClass="min-h-10"
        />
      </PopoverContent>
    </Popover>
  );
}
